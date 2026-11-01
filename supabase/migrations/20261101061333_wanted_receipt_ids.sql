-- Identity sequences allocate before commit; explicit receipt IDs avoid losing
-- a late-committing lower ID when another fill commits first.
drop function public.bt_wanted_ack(uuid,text,bigint);
create function public.bt_wanted_ack(p_player uuid,p_secret text,p_ids bigint[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v breaktime.players := breaktime.wanted_identity(p_player,p_secret,false);
begin
  if p_ids is null or cardinality(p_ids)>100 then raise exception 'bad_receipts'; end if;
  update breaktime.wanted_receipts set acked=true where player_id=v.id and id=any(p_ids) and not acked;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.bt_wanted_ack(uuid,text,bigint[]) from public;
grant execute on function public.bt_wanted_ack(uuid,text,bigint[]) to anon,authenticated;
notify pgrst,'reload schema';
