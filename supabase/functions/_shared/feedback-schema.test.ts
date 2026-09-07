import { validateFeedbackResult } from './feedback-schema.ts';

Deno.test('accepts one score for every allowed rubric dimension', () => {
  const result = validateFeedbackResult(
    {
      status: 'critique',
      image_issue: null,
      critique: {
        strength: 'Ufuk çizgisi okunaklı.',
        priority_issue: 'Ana kütle tam merkezde kalmış.',
        why_it_matters: 'Merkez yerleşimi kompozisyonu durağanlaştırıyor.',
        next_action: 'Ana kütleyi biraz sağa taşı.',
        micro_exercise: null,
        confidence: 'high',
        limitations: null,
        target_improved: null,
        scores: [{ dimension: 'composition', score: 3 }],
      },
    },
    ['composition'],
  );

  if (result.status !== 'critique') throw new Error('expected critique');
});

Deno.test('rejects a model-invented rubric dimension', () => {
  let failed = false;
  try {
    validateFeedbackResult(
      {
        status: 'critique',
        image_issue: null,
        critique: {
          strength: 'Okunaklı.',
          priority_issue: 'Denge zayıf.',
          why_it_matters: 'Odak dağılıyor.',
          next_action: 'Kütleyi kaydır.',
          micro_exercise: null,
          confidence: 'medium',
          limitations: null,
          target_improved: null,
          scores: [{ dimension: 'color', score: 4 }],
        },
      },
      ['composition'],
    );
  } catch {
    failed = true;
  }
  if (!failed) throw new Error('expected invented dimension to be rejected');
});

Deno.test('accepts an explicit better-image response without critique', () => {
  const result = validateFeedbackResult(
    { status: 'needs_better_image', image_issue: 'Fotoğraf çok karanlık.', critique: null },
    ['composition'],
  );
  if (result.status !== 'needs_better_image') throw new Error('expected image quality result');
});
