-- Room buy requests. Farm currency/inventory remain in the existing local save;
-- this ledger owns escrow allocation, fills and durable delivery receipts.
create table breaktime.wanted_catalog (
  item text primary key check (item ~ '^[a-zA-Z]{1,24}(~[2-5])?$')
);
create table breaktime.wanted_orders (
  id bigint generated always as identity primary key,
  room_code text not null references breaktime.rooms(code),
  buyer_id uuid not null references breaktime.players(id),
  buyer_name text not null,
  item text not null references breaktime.wanted_catalog(item),
  qty integer not null check (qty between 1 and 99),
  remaining integer not null check (remaining between 0 and qty),
  price integer not null check (price between 1 and 9999),
  status text not null default 'open' check (status in ('open','filled','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 days',
  check ((status = 'open' and remaining > 0) or (status <> 'open' and remaining = 0))
);
create index wanted_room_open_idx on breaktime.wanted_orders(room_code, id) where status='open';
create index wanted_buyer_idx on breaktime.wanted_orders(buyer_id,created_at desc);
create index wanted_item_idx on breaktime.wanted_orders(item);
create table breaktime.wanted_operations (
  player_id uuid not null references breaktime.players(id),
  operation uuid not null,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (player_id,operation)
);
create index wanted_operations_time_idx on breaktime.wanted_operations(player_id,created_at desc);
create table breaktime.wanted_receipts (
  id bigint generated always as identity primary key,
  player_id uuid not null references breaktime.players(id),
  order_id bigint not null references breaktime.wanted_orders(id),
  item text,
  qty integer not null default 0 check (qty between 0 and 99),
  coins integer not null default 0 check (coins between 0 and 989901),
  note text not null,
  acked boolean not null default false,
  created_at timestamptz not null default now(),
  check ((item is not null and qty > 0 and coins=0) or (item is null and qty=0 and coins>0))
);
create index wanted_receipts_player_idx on breaktime.wanted_receipts(player_id,id) where not acked;
create index wanted_receipts_order_idx on breaktime.wanted_receipts(order_id);
alter table breaktime.wanted_catalog enable row level security;
alter table breaktime.wanted_orders enable row level security;
alter table breaktime.wanted_operations enable row level security;
alter table breaktime.wanted_receipts enable row level security;
revoke all on breaktime.wanted_catalog,breaktime.wanted_orders,breaktime.wanted_operations,breaktime.wanted_receipts from public,anon,authenticated;

-- Read receipts with an old room credential after a disconnect/leave, without
-- exposing the old room's orders or feed to a former member.
create function breaktime.wanted_identity(p_player uuid,p_secret text,p_active boolean default true)
returns breaktime.players language plpgsql stable set search_path='' as $$
declare v breaktime.players;
begin
  select * into v from breaktime.players p where p.id=p_player
    and p.secret_hash=breaktime.hash(p_secret) and (not p_active or p.left_at is null);
  if not found then raise exception 'bad_player'; end if;
  return v;
end $$;
revoke all on function breaktime.wanted_identity(uuid,text,boolean) from public,anon,authenticated;

create function breaktime.wanted_close(p_room text,p_buyer uuid default null,p_reason text default 'expired')
returns void language plpgsql set search_path='' as $$
declare r breaktime.wanted_orders;
begin
  for r in select * from breaktime.wanted_orders w where w.room_code=p_room and w.status='open'
    and (p_buyer is null and w.expires_at<=now() or p_buyer is not null and w.buyer_id=p_buyer)
    order by w.id for update
  loop
    insert into breaktime.wanted_receipts(player_id,order_id,coins,note)
      values(r.buyer_id,r.id,r.remaining*r.price,p_reason);
    update breaktime.wanted_orders set status=p_reason,remaining=0 where id=r.id;
  end loop;
end $$;
revoke all on function breaktime.wanted_close(text,uuid,text) from public,anon,authenticated;

create function public.bt_wanted_state(p_player uuid,p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v breaktime.players := breaktime.wanted_identity(p_player,p_secret,false); rec jsonb; orders jsonb;
begin
  if v.left_at is null then
    perform breaktime.wanted_close(v.room_code);
    select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'buyer',w.buyer_id,'name',w.buyer_name,'item',w.item,
      'qty',w.qty,'remaining',w.remaining,'price',w.price,'expires',w.expires_at) order by w.id desc),'[]'::jsonb)
      into orders from breaktime.wanted_orders w where w.room_code=v.room_code and w.status='open';
  else orders:='[]'::jsonb; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb) into rec from
    (select r.id,r.order_id,r.item,r.qty,r.coins,r.note from breaktime.wanted_receipts r
     where r.player_id=v.id and not r.acked order by r.id limit 100) x;
  return jsonb_build_object('version',1,'me',v.id,'room',v.room_code,'active',v.left_at is null,'open',orders,'receipts',rec,'now',now());
end $$;
revoke all on function public.bt_wanted_state(uuid,text) from public;
grant execute on function public.bt_wanted_state(uuid,text) to anon,authenticated;

create function public.bt_wanted_ack(p_player uuid,p_secret text,p_through bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v breaktime.players := breaktime.wanted_identity(p_player,p_secret,false);
begin
  update breaktime.wanted_receipts set acked=true where player_id=v.id and id<=p_through and not acked;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.bt_wanted_ack(uuid,text,bigint) from public;
grant execute on function public.bt_wanted_ack(uuid,text,bigint) to anon,authenticated;

create function public.bt_wanted_mutate(p_player uuid,p_secret text,p_op uuid,p_action text,
  p_id bigint default null,p_item text default null,p_qty integer default null,p_price integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v breaktime.players := breaktime.wanted_identity(p_player,p_secret,false);
  w breaktime.wanted_orders; old breaktime.wanted_operations;
  payload jsonb := jsonb_build_array(p_action,p_id,p_item,p_qty,p_price);
  result jsonb; err text; new_id bigint;
begin
  -- No-key lock serializes one actor's retries without blocking FK checks on a buyer.
  perform 1 from breaktime.players where id=v.id for no key update;
  select * into old from breaktime.wanted_operations o where o.player_id=v.id and o.operation=p_op;
  if found then
    if old.payload<>payload then return jsonb_build_object('ok',false,'error','op_mismatch'); end if;
    return old.result;
  end if;
  -- A left member may resolve a previously committed operation above, never create a new one.
  v:=breaktime.auth(p_player,p_secret);
  if p_op is null then raise exception 'bad_operation'; end if;
  perform breaktime.wanted_close(v.room_code);
  if (select count(*) from breaktime.wanted_operations o where o.player_id=v.id and o.created_at>now()-interval '1 day')>=120 then
    err:='limit';
  elsif p_action='create' then
    if p_item is null or not exists(select 1 from breaktime.wanted_catalog c where c.item=p_item) then err:='bad_item';
    elsif p_qty is null or p_qty not between 1 and 99 or p_price is null or p_price not between 1 and 9999 then err:='bad_price';
    elsif (select count(*) from breaktime.wanted_orders o where o.buyer_id=v.id and o.status='open')>=6 then err:='too_many';
    else
      insert into breaktime.wanted_orders(room_code,buyer_id,buyer_name,item,qty,remaining,price)
        values(v.room_code,v.id,v.name,p_item,p_qty,p_qty,p_price) returning id into new_id;
      insert into breaktime.events(room_code,from_id,from_name,kind,data)
        values(v.room_code,v.id,v.name,'wanted',jsonb_build_object('id',new_id,'item',p_item,'qty',p_qty,'price',p_price));
      result:=jsonb_build_object('ok',true,'id',new_id,'paid',p_qty*p_price);
    end if;
  elsif p_action in ('fill','cancel') then
    select * into w from breaktime.wanted_orders o where o.id=p_id and o.room_code=v.room_code for update;
    if not found or w.status<>'open' or w.expires_at<=now() then err:='gone';
    elsif p_action='fill' then
      if w.buyer_id=v.id then err:='own';
      elsif p_qty is null or p_qty<1 or p_qty>w.remaining then err:='quantity_changed';
      else
        update breaktime.wanted_orders set remaining=remaining-p_qty,
          status=case when remaining=p_qty then 'filled' else 'open' end where id=w.id;
        insert into breaktime.wanted_receipts(player_id,order_id,item,qty,note)
          values(w.buyer_id,w.id,w.item,p_qty,'bought');
        insert into breaktime.wanted_receipts(player_id,order_id,coins,note)
          values(v.id,w.id,p_qty*w.price,'sold');
        insert into breaktime.events(room_code,from_id,from_name,kind,data)
          values(v.room_code,v.id,v.name,'wanted_fill',jsonb_build_object('id',w.id,'item',w.item,'qty',p_qty,'price',w.price,'buyer',w.buyer_name));
        result:=jsonb_build_object('ok',true,'id',w.id,'qty',p_qty,'total',p_qty*w.price);
      end if;
    elsif w.buyer_id<>v.id then err:='own';
    else
      insert into breaktime.wanted_receipts(player_id,order_id,coins,note) values(v.id,w.id,w.remaining*w.price,'cancelled');
      update breaktime.wanted_orders set status='cancelled',remaining=0 where id=w.id;
      result:=jsonb_build_object('ok',true,'id',w.id);
    end if;
  elsif p_action='cancel_all' then
    perform breaktime.wanted_close(v.room_code,v.id,'cancelled'); result:=jsonb_build_object('ok',true);
  else err:='bad_action'; end if;
  if err is not null then result:=jsonb_build_object('ok',false,'error',err); end if;
  insert into breaktime.wanted_operations(player_id,operation,payload,result) values(v.id,p_op,payload,result);
  return result;
end $$;
revoke all on function public.bt_wanted_mutate(uuid,text,uuid,text,bigint,text,integer,integer) from public;
grant execute on function public.bt_wanted_mutate(uuid,text,uuid,text,bigint,text,integer,integer) to anon,authenticated;

create function breaktime.wanted_on_leave() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.left_at is null and new.left_at is not null then perform breaktime.wanted_close(old.room_code,old.id,'cancelled'); end if;
  return new;
end $$;
revoke all on function breaktime.wanted_on_leave() from public,anon,authenticated;
create trigger wanted_cancel_on_leave after update of left_at on breaktime.players
  for each row execute function breaktime.wanted_on_leave();
-- Existing room feed is the announcement channel; no extra broadcast transport.
alter table breaktime.events drop constraint events_kind_check;
alter table breaktime.events add constraint events_kind_check check(kind in ('join','leave','water','pest','gift','wave','wanted','wanted_fill'));
notify pgrst,'reload schema';

insert into breaktime.wanted_catalog(item) values
('alpineCheese'),
('apple'),
('apple~2'),
('apple~3'),
('apple~4'),
('apple~5'),
('avocado'),
('avocado~2'),
('avocado~3'),
('avocado~4'),
('avocado~5'),
('bambooCurry'),
('bambooCurry~2'),
('bambooCurry~3'),
('bambooCurry~4'),
('bambooCurry~5'),
('bambooShoot'),
('banana'),
('banana~2'),
('banana~3'),
('banana~4'),
('banana~5'),
('barracuda'),
('bellPepper'),
('bellPepper~2'),
('bellPepper~3'),
('bellPepper~4'),
('bellPepper~5'),
('berryJuice'),
('blackEgg'),
('blueberry'),
('blueberry~2'),
('blueberry~3'),
('blueberry~4'),
('blueberry~5'),
('bouquet'),
('bread'),
('bread~2'),
('bread~3'),
('bread~4'),
('bread~5'),
('broccoli'),
('broccoli~2'),
('broccoli~3'),
('broccoli~4'),
('broccoli~5'),
('butter'),
('cabbage'),
('cabbage~2'),
('cabbage~3'),
('cabbage~4'),
('cabbage~5'),
('cannedTuna'),
('carrot'),
('carrotCake'),
('carrotCake~2'),
('carrotCake~3'),
('carrotCake~4'),
('carrotCake~5'),
('carrot~2'),
('carrot~3'),
('carrot~4'),
('carrot~5'),
('chair'),
('cheese'),
('cheeseEgg'),
('cheeseEgg~2'),
('cheeseEgg~3'),
('cheeseEgg~4'),
('cheeseEgg~5'),
('cheesecake'),
('cheesecake~2'),
('cheesecake~3'),
('cheesecake~4'),
('cheesecake~5'),
('cherry'),
('cherry~2'),
('cherry~3'),
('cherry~4'),
('cherry~5'),
('chili'),
('chili~2'),
('chili~3'),
('chili~4'),
('chili~5'),
('chocoMilk'),
('chocolate'),
('cloth'),
('coal'),
('cocoa'),
('cocoa~2'),
('cocoa~3'),
('cocoa~4'),
('cocoa~5'),
('coconut'),
('coconut~2'),
('coconut~3'),
('coconut~4'),
('coconut~5'),
('coffee'),
('coffeePowder'),
('coffee~2'),
('coffee~3'),
('coffee~4'),
('coffee~5'),
('conch'),
('copperBar'),
('copperOre'),
('coral'),
('corn'),
('corn~2'),
('corn~3'),
('corn~4'),
('corn~5'),
('crab'),
('crabFriedRice'),
('crabFriedRice~2'),
('crabFriedRice~3'),
('crabFriedRice~4'),
('crabFriedRice~5'),
('crownDeep'),
('crystalBerry'),
('crystalBerry~2'),
('crystalBerry~3'),
('crystalBerry~4'),
('crystalBerry~5'),
('cucumber'),
('cucumber~2'),
('cucumber~3'),
('cucumber~4'),
('cucumber~5'),
('curry'),
('curry~2'),
('curry~3'),
('curry~4'),
('curry~5'),
('custard'),
('custard~2'),
('custard~3'),
('custard~4'),
('custard~5'),
('diamond'),
('diamondCut'),
('dragonChili'),
('dragonChili~2'),
('dragonChili~3'),
('dragonChili~4'),
('dragonChili~5'),
('dragonFish'),
('driedTea'),
('duckEgg'),
('dumpling'),
('dumpling~2'),
('dumpling~3'),
('dumpling~4'),
('dumpling~5'),
('egg'),
('eggplant'),
('eggplant~2'),
('eggplant~3'),
('eggplant~4'),
('eggplant~5'),
('emerald'),
('emeraldCut'),
('fArm'),
('fLeg'),
('fNeck'),
('fRib'),
('fSkull'),
('fSpine'),
('fTail'),
('fTooth'),
('farmTea'),
('farmTea~2'),
('farmTea~3'),
('farmTea~4'),
('farmTea~5'),
('feather'),
('fish'),
('fishSauce'),
('flour'),
('friedMackerel'),
('friedMackerel~2'),
('friedMackerel~3'),
('friedMackerel~4'),
('friedMackerel~5'),
('fruitCrystal'),
('fruitGold'),
('fruitHeart'),
('fruitPunch'),
('fruitPunch~2'),
('fruitPunch~3'),
('fruitPunch~4'),
('fruitPunch~5'),
('fruitRainbow'),
('fruitSalad'),
('fruitSalad~2'),
('fruitSalad~3'),
('fruitSalad~4'),
('fruitSalad~5'),
('fruitStar'),
('galangal'),
('galaxyMelon'),
('galaxyMelon~2'),
('galaxyMelon~3'),
('galaxyMelon~4'),
('galaxyMelon~5'),
('garlic'),
('garlic~2'),
('garlic~3'),
('garlic~4'),
('garlic~5'),
('ghostFish'),
('giantCatfish'),
('giantClam'),
('giantSquid'),
('goldBar'),
('goldCheese'),
('goldLantern'),
('goldLantern~2'),
('goldLantern~3'),
('goldLantern~4'),
('goldLantern~5'),
('goldOre'),
('goldenEgg'),
('grape'),
('grape~2'),
('grape~3'),
('grape~4'),
('grape~5'),
('greenApple'),
('greenApple~2'),
('greenApple~3'),
('greenApple~4'),
('greenApple~5'),
('grilledFish'),
('grilledFish~2'),
('grilledFish~3'),
('grilledFish~4'),
('grilledFish~5'),
('grilledTuna'),
('grilledTuna~2'),
('grilledTuna~3'),
('grilledTuna~4'),
('grilledTuna~5'),
('grouper'),
('hammerhead'),
('herbTonic'),
('herbTonic~2'),
('herbTonic~3'),
('herbTonic~4'),
('herbTonic~5'),
('honey'),
('honeyToast'),
('honeyToast~2'),
('honeyToast~3'),
('honeyToast~4'),
('honeyToast~5'),
('hotChoc'),
('hotChoc~2'),
('hotChoc~3'),
('hotChoc~4'),
('hotChoc~5'),
('iceCream'),
('iceCream~2'),
('iceCream~3'),
('iceCream~4'),
('iceCream~5'),
('icedCoffee'),
('icedCoffee~2'),
('icedCoffee~3'),
('icedCoffee~4'),
('icedCoffee~5'),
('ironBar'),
('ironOre'),
('jadeEgg'),
('jam'),
('jellyfish'),
('kiwi'),
('kiwi~2'),
('kiwi~3'),
('kiwi~4'),
('kiwi~5'),
('lemon'),
('lemongrass'),
('lemon~2'),
('lemon~3'),
('lemon~4'),
('lemon~5'),
('lingzhi'),
('lingzhiTea'),
('lingzhiTea~2'),
('lingzhiTea~3'),
('lingzhiTea~4'),
('lingzhiTea~5'),
('lobster'),
('lotusGod'),
('lotusGod~2'),
('lotusGod~3'),
('lotusGod~4'),
('lotusGod~5'),
('luckyClover'),
('luckyClover~2'),
('luckyClover~3'),
('luckyClover~4'),
('luckyClover~5'),
('mackerel'),
('mango'),
('mango~2'),
('mango~3'),
('mango~4'),
('mango~5'),
('mantaRay'),
('melon'),
('melon~2'),
('melon~3'),
('melon~4'),
('melon~5'),
('milk'),
('moonFruit'),
('moonFruit~2'),
('moonFruit~3'),
('moonFruit~4'),
('moonFruit~5'),
('moonMilk'),
('moonPumpkin'),
('moonPumpkin~2'),
('moonPumpkin~3'),
('moonPumpkin~4'),
('moonPumpkin~5'),
('moonWhale'),
('mooncake'),
('mushroom'),
('mushroomYum'),
('mushroomYum~2'),
('mushroomYum~3'),
('mushroomYum~4'),
('mushroomYum~5'),
('mushroom~2'),
('mushroom~3'),
('mushroom~4'),
('mushroom~5'),
('naga'),
('nagaTrident'),
('nestHeaven'),
('noodle'),
('noodle~2'),
('noodle~3'),
('noodle~4'),
('noodle~5'),
('octopus'),
('olive'),
('olive~2'),
('olive~3'),
('olive~4'),
('olive~5'),
('omelet'),
('omelet~2'),
('omelet~3'),
('omelet~4'),
('omelet~5'),
('onion'),
('onion~2'),
('onion~3'),
('onion~4'),
('onion~5'),
('oyster'),
('pancake'),
('pancake~2'),
('pancake~3'),
('pancake~4'),
('pancake~5'),
('pandan'),
('pandanCake'),
('pandanCake~2'),
('pandanCake~3'),
('pandanCake~4'),
('pandanCake~5'),
('pandanDrink'),
('pandanDrink~2'),
('pandanDrink~3'),
('pandanDrink~4'),
('pandanDrink~5'),
('peach'),
('peach~2'),
('peach~3'),
('peach~4'),
('peach~5'),
('pear'),
('pearl'),
('pear~2'),
('pear~3'),
('pear~4'),
('pear~5'),
('pineapple'),
('pineapple~2'),
('pineapple~3'),
('pineapple~4'),
('pineapple~5'),
('pinkWool'),
('pizza'),
('pizza~2'),
('pizza~3'),
('pizza~4'),
('pizza~5'),
('planetShard'),
('plank'),
('potato'),
('potato~2'),
('potato~3'),
('potato~4'),
('potato~5'),
('puffer'),
('pumpkin'),
('pumpkinPie'),
('pumpkinPie~2'),
('pumpkinPie~3'),
('pumpkinPie~4'),
('pumpkinPie~5'),
('pumpkin~2'),
('pumpkin~3'),
('pumpkin~4'),
('pumpkin~5'),
('rainbowCorn'),
('rainbowCorn~2'),
('rainbowCorn~3'),
('rainbowCorn~4'),
('rainbowCorn~5'),
('rainbowWool'),
('resin'),
('ruby'),
('rubyCut'),
('salad'),
('salad~2'),
('salad~3'),
('salad~4'),
('salad~5'),
('salt'),
('saltedFish'),
('sandwich'),
('sandwich~2'),
('sandwich~3'),
('sandwich~4'),
('sandwich~5'),
('sapphire'),
('sapphireCut'),
('scallop'),
('scarf'),
('scarf~2'),
('scarf~3'),
('scarf~4'),
('scarf~5'),
('seaCrab'),
('seaGlass'),
('seaweed'),
('seaweedSalad'),
('seaweedSalad~2'),
('seaweedSalad~3'),
('seaweedSalad~4'),
('seaweedSalad~5'),
('shark'),
('shiitake'),
('shrimp'),
('silverBar'),
('silverOre'),
('skyKoi'),
('smoothie'),
('smoothie~2'),
('smoothie~3'),
('smoothie~4'),
('smoothie~5'),
('somTamPu'),
('somTamPu~2'),
('somTamPu~3'),
('somTamPu~4'),
('somTamPu~5'),
('soup'),
('soup~2'),
('soup~3'),
('soup~4'),
('soup~5'),
('squid'),
('starTomato'),
('starTomato~2'),
('starTomato~3'),
('starTomato~4'),
('starTomato~5'),
('starfish'),
('stirShiitake'),
('stirShiitake~2'),
('stirShiitake~3'),
('stirShiitake~4'),
('stirShiitake~5'),
('stone'),
('strawMushroom'),
('strawberry'),
('strawberry~2'),
('strawberry~3'),
('strawberry~4'),
('strawberry~5'),
('sushi'),
('sushi~2'),
('sushi~3'),
('sushi~4'),
('sushi~5'),
('swanEgg'),
('sweetPotato'),
('sweetPotato~2'),
('sweetPotato~3'),
('sweetPotato~4'),
('sweetPotato~5'),
('swordfish'),
('taco'),
('taco~2'),
('taco~3'),
('taco~4'),
('taco~5'),
('tangerine'),
('tangerine~2'),
('tangerine~3'),
('tangerine~4'),
('tangerine~5'),
('tea'),
('tea~2'),
('tea~3'),
('tea~4'),
('tea~5'),
('tempura'),
('tempura~2'),
('tempura~3'),
('tempura~4'),
('tempura~5'),
('thaiTea'),
('thaiTea~2'),
('thaiTea~3'),
('thaiTea~4'),
('thaiTea~5'),
('tomKha'),
('tomKha~2'),
('tomKha~3'),
('tomKha~4'),
('tomKha~5'),
('tomYumKung'),
('tomYumKung~2'),
('tomYumKung~3'),
('tomYumKung~4'),
('tomYumKung~5'),
('tomato'),
('tomato~2'),
('tomato~3'),
('tomato~4'),
('tomato~5'),
('tropical'),
('truffle'),
('truffleOil'),
('tuna'),
('tunaSalad'),
('tunaSalad~2'),
('tunaSalad~3'),
('tunaSalad~4'),
('tunaSalad~5'),
('veggieJuice'),
('watermelon'),
('watermelon~2'),
('watermelon~3'),
('watermelon~4'),
('watermelon~5'),
('wheat'),
('wheat~2'),
('wheat~3'),
('wheat~4'),
('wheat~5'),
('whiteTruffle'),
('wildHoney'),
('wood'),
('wool'),
('woolDoll'),
('woolDoll~2'),
('woolDoll~3'),
('woolDoll~4'),
('woolDoll~5'),
('wovenBasket');
