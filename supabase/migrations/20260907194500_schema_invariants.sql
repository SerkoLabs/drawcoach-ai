begin;

create or replace function public.skill_dimensions_are_unique(values_array public.skill_dimension[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select cardinality(values_array) = (
    select count(distinct dimension_value)
    from unnest(values_array) as dimension_value
  );
$$;

revoke all on function public.skill_dimensions_are_unique(public.skill_dimension[]) from public, anon, authenticated;

alter table public.lesson_checkpoints
  add constraint lesson_checkpoints_rubric_dimensions_unique
  check (public.skill_dimensions_are_unique(rubric_dimensions));

commit;
