insert into public.demographic_questions (id, question, created_by_user_id, modified_by_user_id)
values (
  6,
  'Are you or have you ever been an undergraduate student at Columbia?',
  '56241879-69b6-40ec-b75e-b0c6cf175ab1',
  '56241879-69b6-40ec-b75e-b0c6cf175ab1'
)
on conflict (id) do update set
  question = excluded.question,
  modified_datetime_utc = now(),
  modified_by_user_id = excluded.modified_by_user_id;

insert into public.demographic_answer_question_mapping
  (id, question_id, answer_id, display_order, is_deleted, created_by_user_id, modified_by_user_id)
values
  (133, 6, 1, 0, false, '56241879-69b6-40ec-b75e-b0c6cf175ab1', '56241879-69b6-40ec-b75e-b0c6cf175ab1'),
  (134, 6, 2, 1, false, '56241879-69b6-40ec-b75e-b0c6cf175ab1', '56241879-69b6-40ec-b75e-b0c6cf175ab1')
on conflict (id) do update set
  question_id = excluded.question_id,
  answer_id = excluded.answer_id,
  display_order = excluded.display_order,
  is_deleted = excluded.is_deleted,
  modified_datetime_utc = now(),
  modified_by_user_id = excluded.modified_by_user_id;

select setval(
  'public.demographic_questions_id_seq',
  greatest(coalesce((select max(id) from public.demographic_questions), 1), 6)
);

select setval(
  'public.demographic_answer_question_mapping_id_seq',
  greatest(coalesce((select max(id) from public.demographic_answer_question_mapping), 1), 134)
);
