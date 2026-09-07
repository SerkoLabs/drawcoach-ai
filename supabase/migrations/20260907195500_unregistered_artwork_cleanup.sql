begin;

create policy artwork_objects_delete_unregistered_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'artwork'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1
    from public.artwork_submissions s
    where s.user_id = auth.uid()
      and s.storage_path = storage.objects.name
  )
);

commit;
