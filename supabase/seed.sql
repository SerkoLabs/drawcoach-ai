-- Deterministic local catalog seed for DrawCoach AI.
-- No user/account data is seeded here.

insert into public.learning_paths (
  id, slug, category, medium, title, description, estimated_weeks, is_active, sort_order
)
values
  ('11111111-1111-4111-8111-111111111111', 'landscape-pencil', 'landscape', 'pencil', 'Manzara • Kurşun Kalem', 'Kompozisyon, perspektif, değer ve çizgi kontrolünü kurşun kalemle geliştir.', 12, true, 10),
  ('22222222-2222-4222-8222-222222222222', 'landscape-watercolor', 'landscape', 'watercolor', 'Manzara • Suluboya', 'Atmosfer, renk, değer ve su kontrolü üzerinden manzara pratiği yap.', 12, true, 20),
  ('33333333-3333-4333-8333-333333333333', 'portrait-pencil', 'portrait', 'pencil', 'Portre • Kurşun Kalem', 'Oran, yapı, değer ve kenar kontrolüyle portre çizimini geliştir.', 12, true, 30),
  ('44444444-4444-4444-8444-444444444444', 'portrait-watercolor', 'portrait', 'watercolor', 'Portre • Suluboya', 'Portre yapısını suluboya değer ve renk katmanlarıyla çalış.', 12, true, 40)
on conflict (slug) do update
set category = excluded.category,
    medium = excluded.medium,
    title = excluded.title,
    description = excluded.description,
    estimated_weeks = excluded.estimated_weeks,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

-- The first vertical slice owns one complete lesson. Other path lesson content is intentionally not faked.
do $$
declare
  v_path_id uuid;
  v_lesson_id uuid;
begin
  select id into v_path_id
  from public.learning_paths
  where slug = 'landscape-pencil';

  insert into public.lessons (
    id,
    path_id,
    lesson_number,
    title,
    objective,
    instructions,
    materials,
    estimated_minutes,
    is_active
  )
  values (
    '11111111-1111-4111-8111-111111111101',
    v_path_id,
    1,
    'Kompozisyon ve Ufuk Çizgisi',
    'Basit bir manzarada odak noktasını ve ufuk çizgisini bilinçli yerleştirmek.',
    'Detay eklemeden önce büyük kütleleri kur. Bu derste tek hedef güzel bir bitmiş resim değil; okunaklı bir kompozisyon kurmak ve düzeltme döngüsünü tamamlamak.',
    array['HB veya 2B kurşun kalem', 'Silgi', 'A4 veya benzeri çizim kağıdı'],
    30,
    true
  )
  on conflict (path_id, lesson_number) do update
  set title = excluded.title,
      objective = excluded.objective,
      instructions = excluded.instructions,
      materials = excluded.materials,
      estimated_minutes = excluded.estimated_minutes,
      is_active = excluded.is_active
  returning id into v_lesson_id;

  insert into public.lesson_checkpoints (
    id,
    lesson_id,
    position,
    title,
    instruction,
    capture_guidance,
    rubric_dimensions,
    rubric_notes,
    is_active
  )
  values
    (
      '11111111-1111-4111-8111-111111111201',
      v_lesson_id,
      1,
      'Büyük şekilleri yerleştir',
      'Gökyüzü, zemin ve ana dağ/ağaç kütlesini yalnızca hafif çizgilerle yerleştir. Ayrıntıya girme.',
      'Kağıdın tamamı görünsün; fotoğrafı mümkün olduğunca tepeden ve gölgesiz çek.',
      array['composition'::public.skill_dimension],
      jsonb_build_object(
        'focus', 'subject placement and visual balance',
        'avoid', 'judging detail or rendering quality at this checkpoint'
      ),
      true
    ),
    (
      '11111111-1111-4111-8111-111111111202',
      v_lesson_id,
      2,
      'Ufuk ve derinlik ilişkisini kur',
      'Ufuk çizgisini netleştir; ön plan, orta plan ve arka planın birbirinden okunmasını sağlayacak konum ilişkilerini kur.',
      'Çizgiler okunacak kadar net olsun fakat koyu gölgeleme ekleme.',
      array['composition'::public.skill_dimension, 'perspective_proportion'::public.skill_dimension],
      jsonb_build_object(
        'focus', 'horizon placement, scale change and spatial separation',
        'avoid', 'inventing precise linear perspective where the scene does not require it'
      ),
      true
    ),
    (
      '11111111-1111-4111-8111-111111111203',
      v_lesson_id,
      3,
      'Üç değerle okunaklı hale getir',
      'Çalışmayı açık, orta ve koyu olmak üzere üç ana değer grubuyla tamamla. En koyu alanı odak noktasını desteklemek için kullan.',
      'Parlama veya çok koyu fotoğraf oluşmadığından emin ol.',
      array['composition'::public.skill_dimension, 'value_light'::public.skill_dimension, 'medium_control'::public.skill_dimension],
      jsonb_build_object(
        'focus', 'value grouping, focal contrast and controlled pencil pressure',
        'avoid', 'penalizing personal style when the value structure is readable'
      ),
      true
    )
  on conflict (lesson_id, position) do update
  set title = excluded.title,
      instruction = excluded.instruction,
      capture_guidance = excluded.capture_guidance,
      rubric_dimensions = excluded.rubric_dimensions,
      rubric_notes = excluded.rubric_notes,
      is_active = excluded.is_active;
end;
$$;
