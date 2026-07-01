-- 체험(데모)용 우산 3개: umb-29/30/31. 실제 학생에게는 빌려주지 않는 데모 전용.
-- prod 에는 이미 수동 적용됨. 재적용 안전을 위해 on conflict do nothing.
insert into public.umbrellas (id, label, qr_payload, status, number)
values
  ('umb-29', '29번 우산 (체험용)', 'umb-29', 'available', 29),
  ('umb-30', '30번 우산 (체험용)', 'umb-30', 'available', 30),
  ('umb-31', '31번 우산 (체험용)', 'umb-31', 'available', 31)
on conflict (id) do nothing;
