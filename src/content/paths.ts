/**
 * Seed learning content for the four MVP paths:
 *   landscape × {pencil, watercolor}, portrait × {pencil, watercolor}
 *
 * Category-common conceptual lessons are composed with medium-specific
 * lessons so the arc is coherent while each path stays distinct. Lesson and
 * checkpoint ids are path-scoped (`${pathId}-l1-c2`) to be globally unique,
 * which the progress store relies on.
 */

import type {
  Category,
  Checkpoint,
  LearningPath,
  Lesson,
  Medium,
  SkillDimension,
} from '@/domain/types';

interface CheckpointSeed {
  title: string;
  instruction: string;
  assignment: string;
  successCriteria: string[];
  dimensions: SkillDimension[];
  criteria: string[];
  microExerciseHint?: string;
}

interface LessonSeed {
  title: string;
  objective: string;
  overview: string;
  estMinutes: number;
  primarySkills: SkillDimension[];
  checkpoints: CheckpointSeed[];
}

function buildLesson(pathId: string, number: number, seed: LessonSeed): Lesson {
  const id = `${pathId}-l${number}`;
  const checkpoints: Checkpoint[] = seed.checkpoints.map((c, i) => ({
    id: `${id}-c${i + 1}`,
    title: c.title,
    instruction: c.instruction,
    assignment: c.assignment,
    successCriteria: c.successCriteria,
    rubric: { dimensions: c.dimensions, criteria: c.criteria },
    microExerciseHint: c.microExerciseHint,
  }));
  return {
    id,
    number,
    title: seed.title,
    objective: seed.objective,
    overview: seed.overview,
    estMinutes: seed.estMinutes,
    primarySkills: seed.primarySkills,
    checkpoints,
  };
}

// ---------------------------------------------------------------------------
// Landscape — category-common conceptual lessons
// ---------------------------------------------------------------------------

const landscapeLessons: LessonSeed[] = [
  {
    title: 'Seeing the big shapes',
    objective: 'Design a strong, readable composition before adding any detail.',
    overview:
      'Great landscapes are decided in the first two minutes. You will simplify your scene into a few large shapes and place them deliberately so the viewer’s eye lands where you want it.',
    estMinutes: 25,
    primarySkills: ['composition'],
    checkpoints: [
      {
        title: 'Three thumbnails',
        instruction:
          'Pick a landscape reference or window view. Draw three small thumbnails (about 5×7 cm). In each, move the horizon and the main focal element to a different position. Keep them loose — shapes only, no detail.',
        assignment: 'Photograph all three thumbnails together.',
        successCriteria: [
          'Three clearly different arrangements',
          'Horizon avoids splitting the page exactly in half',
          'A clear focal area in at least one thumbnail',
        ],
        dimensions: ['composition'],
        criteria: [
          'Do the three thumbnails explore genuinely different layouts (horizon height, focal placement)?',
          'Is the horizon placed off-center in at least one, following the rule of thirds?',
          'Is there an identifiable focal point rather than an even, flat spread of shapes?',
        ],
        microExerciseHint:
          'If all three look similar, redraw one with the horizon very low and one very high.',
      },
      {
        title: 'Big-shape block-in',
        instruction:
          'Choose your strongest thumbnail and scale it up. Block in only the major masses — sky, land, water, and the focal element — as flat, simple shapes. Resist adding detail.',
        assignment: 'Photograph the block-in.',
        successCriteria: [
          'Scene reads clearly from across the room',
          'No more than 4–5 large shapes',
          'Focal element has a distinct shape and placement',
        ],
        dimensions: ['composition', 'value'],
        criteria: [
          'Are the major masses simplified into a few flat shapes rather than fragmented detail?',
          'Does the composition still read clearly and match the chosen thumbnail?',
          'Is the focal element given a distinct, well-placed shape?',
        ],
      },
    ],
  },
  {
    title: 'Depth and space',
    objective: 'Create believable distance using overlap, scale and atmosphere.',
    overview:
      'Depth is an illusion built from a few reliable cues. You will layer foreground, midground and background and then push the background back with atmospheric perspective.',
    estMinutes: 30,
    primarySkills: ['perspective'],
    checkpoints: [
      {
        title: 'Layer the space',
        instruction:
          'Draw the same scene establishing three clear layers: foreground, midground, background. Use overlap and diminishing size so nearer elements are larger and partly cover farther ones.',
        assignment: 'Photograph the layered drawing.',
        successCriteria: [
          'Three readable depth layers',
          'Nearer elements overlap farther ones',
          'Objects shrink believably with distance',
        ],
        dimensions: ['perspective', 'composition'],
        criteria: [
          'Are there three distinct depth planes (foreground, midground, background)?',
          'Is overlap used so nearer shapes clearly sit in front of farther ones?',
          'Does the scale of repeated elements diminish convincingly with distance?',
        ],
      },
      {
        title: 'Atmospheric perspective',
        instruction:
          'Now push the background back: reduce contrast and detail in the distance, keep the sharpest contrast and most detail in the foreground focal area.',
        assignment: 'Photograph the updated drawing.',
        successCriteria: [
          'Distance is lower-contrast and softer',
          'Foreground holds the crispest edges and darkest darks',
          'A clear sense of receding space',
        ],
        dimensions: ['perspective', 'value'],
        criteria: [
          'Does contrast decrease with distance (background lighter and softer than foreground)?',
          'Is detail concentrated in the foreground focal area rather than spread evenly?',
          'Overall, is there a convincing sense of receding space?',
        ],
        microExerciseHint:
          'Squint at your reference: the background should almost disappear compared to the foreground.',
      },
    ],
  },
  {
    title: 'Value structure and light',
    objective: 'Organize the scene into a clear, deliberate value pattern.',
    overview:
      'Before color or detail, a landscape lives or dies on its value design. You will reduce the scene to a few values and then commit to a single light direction.',
    estMinutes: 30,
    primarySkills: ['value'],
    checkpoints: [
      {
        title: 'Three-value notan',
        instruction:
          'Reduce your scene to exactly three values — light, mid, dark. Fill each shape with one of the three, no blending. This is your value map.',
        assignment: 'Photograph the three-value study.',
        successCriteria: [
          'Only three distinct values used',
          'Shapes grouped into readable value masses',
          'A clear light/dark pattern that guides the eye',
        ],
        dimensions: ['value', 'composition'],
        criteria: [
          'Are there exactly three clearly separated values with no muddy in-betweens?',
          'Are shapes grouped into a few large value masses rather than scattered?',
          'Does the light/dark pattern create a clear focal path?',
        ],
      },
      {
        title: 'Light direction and form',
        instruction:
          'Commit to one light direction. Add a mid-value gradient to the main masses so lit planes face the light and shadow planes turn away, consistently across the whole scene.',
        assignment: 'Photograph the value drawing.',
        successCriteria: [
          'One consistent light direction throughout',
          'Lit and shadow planes clearly distinguished',
          'Forms feel three-dimensional, not flat',
        ],
        dimensions: ['value'],
        criteria: [
          'Is the light direction consistent across every mass in the scene?',
          'Are lit planes and shadow planes clearly separated in value?',
          'Do the major forms read as three-dimensional?',
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Portrait — category-common conceptual lessons
// ---------------------------------------------------------------------------

const portraitLessons: LessonSeed[] = [
  {
    title: 'Head construction',
    objective: 'Build the head as a solid, correctly proportioned structure.',
    overview:
      'Likeness starts with structure, not features. You will construct the head from a ball and jaw, then add the centerline and horizontal guidelines that everything else hangs from.',
    estMinutes: 30,
    primarySkills: ['perspective'],
    checkpoints: [
      {
        title: 'Ball, jaw and centerline',
        instruction:
          'Construct a head from a circle (cranium) with the sides flattened, then attach the jaw. Add a vertical centerline down the face and mark the brow, nose-base and mouth lines.',
        assignment: 'Photograph the construction drawing.',
        successCriteria: [
          'Cranium and jaw read as one solid form',
          'Centerline curves correctly for the head’s tilt/turn',
          'Brow, nose and mouth guidelines placed',
        ],
        dimensions: ['perspective'],
        criteria: [
          'Is the cranium-plus-jaw construction solid and believable as a 3D form?',
          'Does the centerline sit correctly for the head’s angle (not just straight down)?',
          'Are the horizontal feature guidelines present and reasonably spaced?',
        ],
        microExerciseHint:
          'Eyes sit roughly halfway down the head — most beginners place them too high.',
      },
      {
        title: 'Feature placement',
        instruction:
          'On your construction, place the eyes on the brow-to-nose midline, mark the nose base and mouth using standard spacing, and check eye width against the space between the eyes (about one eye).',
        assignment: 'Photograph the placement drawing.',
        successCriteria: [
          'Eyes on the correct horizontal line',
          'One eye-width between the eyes',
          'Nose and mouth at believable heights',
        ],
        dimensions: ['perspective', 'composition'],
        criteria: [
          'Are the eyes placed on the correct horizontal guideline (about halfway down the head)?',
          'Is the spacing between the eyes about one eye-width?',
          'Are the nose base and mouth at believable proportional heights?',
        ],
      },
    ],
  },
  {
    title: 'Massing the features',
    objective: 'Block features as simple shapes and check them against a reference.',
    overview:
      'You will simplify each feature into a clean shape and then measure your block-in against the reference to catch proportion errors early, while they are still easy to fix.',
    estMinutes: 30,
    primarySkills: ['composition', 'perspective'],
    checkpoints: [
      {
        title: 'Simplified feature shapes',
        instruction:
          'Using a reference face, block the eyes, nose, mouth and hair mass as simple flat shapes. Match the size relationships between features — do not render yet.',
        assignment: 'Photograph the block-in beside nothing else — just the drawing.',
        successCriteria: [
          'Each feature is a clean, simple shape',
          'Relative sizes match the reference',
          'Hair treated as a mass, not strands',
        ],
        dimensions: ['perspective', 'composition'],
        criteria: [
          'Are features simplified into clean shapes rather than prematurely detailed?',
          'Do the relative sizes of the features match a typical face / the reference?',
          'Is the hair handled as a single mass rather than individual strands?',
        ],
      },
      {
        title: 'Likeness check',
        instruction:
          'Compare angles and proportions to your reference. Check the tilt of the eye line, the width of the nose, and the distance from nose to mouth. Adjust anything that is off.',
        assignment: 'Photograph the corrected drawing.',
        successCriteria: [
          'Eye-line tilt matches the reference',
          'Nose width and mouth distance corrected',
          'Overall proportions feel like the same person',
        ],
        dimensions: ['perspective'],
        criteria: [
          'Does the tilt/alignment of the eye line match the reference angle?',
          'Are nose width and nose-to-mouth distance proportionally correct?',
          'Does the overall proportion read as a believable, specific face?',
        ],
        microExerciseHint:
          'Flip your drawing horizontally (or in a mirror) — proportion errors jump out instantly.',
      },
    ],
  },
  {
    title: 'Value and form on the face',
    objective: 'Model the face with a clear light logic and controlled edges.',
    overview:
      'Faces are a landscape of planes. You will map the shadow shapes with one light source, then control your edges so forms turn softly where they should and crisply where they should.',
    estMinutes: 35,
    primarySkills: ['value'],
    checkpoints: [
      {
        title: 'Core shadow and planes',
        instruction:
          'With one clear light direction, fill in the shadow shapes as a connected pattern (eye sockets, under the nose, under the lip and jaw). Keep the lit side clean.',
        assignment: 'Photograph the value block-in.',
        successCriteria: [
          'One consistent light direction',
          'Shadow shapes connect into a readable pattern',
          'Clear separation between light and shadow families',
        ],
        dimensions: ['value'],
        criteria: [
          'Is there a single, consistent light direction on the face?',
          'Do the shadow shapes connect into a readable pattern rather than scattered marks?',
          'Are the light and shadow value families clearly separated (not muddy)?',
        ],
      },
      {
        title: 'Edges and form modeling',
        instruction:
          'Refine transitions: soften edges where the form turns gradually (cheeks, forehead) and keep edges crisp where planes meet sharply (nose, jaw). Add the halftone between light and core shadow.',
        assignment: 'Photograph the modeled drawing.',
        successCriteria: [
          'Soft edges on rounded turns, crisp edges on sharp planes',
          'A believable halftone bridges light and shadow',
          'The face reads as a solid 3D form',
        ],
        dimensions: ['value', 'medium'],
        criteria: [
          'Is there a deliberate mix of soft and hard edges appropriate to the forms?',
          'Is there a halftone transition between the light and the core shadow?',
          'Does the face read as a convincingly solid, three-dimensional form?',
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Medium-specific lessons
// ---------------------------------------------------------------------------

const pencilLesson: LessonSeed = {
  title: 'Pencil control: value, edges and texture',
  objective: 'Command the graphite — even values, clean gradients and controlled edges.',
  overview:
    'The pencil is capable of a huge range if you control pressure and edges. You will build a value scale, a smooth gradient, and then a small texture study to bring it together.',
  estMinutes: 30,
  primarySkills: ['medium', 'value'],
  checkpoints: [
    {
      title: 'Five-step value scale and gradient',
      instruction:
        'Draw a strip of five boxes and fill them from lightest to darkest with clearly separated, even values. Beside it, draw a rectangle with a smooth gradient from white to your darkest dark.',
      assignment: 'Photograph the value scale and gradient.',
      successCriteria: [
        'Five clearly distinct, evenly-spaced values',
        'Each box filled evenly with no patchiness',
        'A smooth, gradual gradient with no visible steps',
      ],
      dimensions: ['medium', 'value'],
      criteria: [
        'Are there five distinct value steps with even spacing between them?',
        'Is each box filled smoothly and evenly (consistent pressure, no patchiness)?',
        'Is the gradient smooth and continuous, without banding or abrupt jumps?',
      ],
      microExerciseHint:
        'Hold the pencil lower and use the side of the lead for smoother, more even tone.',
    },
    {
      title: 'Edge and texture study',
      instruction:
        'Pick one texture that suits your subject (foliage, bark, fabric, or hair). Render a small patch showing both a hard edge and a soft edge, and a light-to-dark transition through the texture.',
      assignment: 'Photograph the texture study.',
      successCriteria: [
        'Convincing texture, not scribble',
        'A clear hard edge and a clear soft edge',
        'Value transition reads through the texture',
      ],
      dimensions: ['medium'],
      criteria: [
        'Does the mark-making convincingly suggest the chosen texture?',
        'Are both a hard edge and a soft edge deliberately present?',
        'Does a light-to-dark value transition read clearly through the texture?',
      ],
    },
  ],
};

const watercolorWashLesson: LessonSeed = {
  title: 'Watercolor foundations: washes and water control',
  objective: 'Control the water — even washes, smooth grades and predictable edges.',
  overview:
    'Watercolor is really water management. You will practice a flat wash, a graded wash, and the difference between wet-on-wet and wet-on-dry so you can choose your edges on purpose.',
  estMinutes: 30,
  primarySkills: ['medium'],
  checkpoints: [
    {
      title: 'Flat and graded washes',
      instruction:
        'Paint one flat wash (even color across a rectangle) and one graded wash (smoothly fading from strong to pale). Tilt the paper slightly and keep a wet bead moving down the shape.',
      assignment: 'Photograph both washes.',
      successCriteria: [
        'Flat wash is even, no blooms or hard streaks',
        'Graded wash fades smoothly',
        'No cauliflower back-runs',
      ],
      dimensions: ['medium'],
      criteria: [
        'Is the flat wash even, without streaks, blooms or hard lines?',
        'Does the graded wash transition smoothly from strong to pale?',
        'Are back-runs / blooms avoided (a sign of controlled water load)?',
      ],
      microExerciseHint:
        'Mix more wash than you think you need — running out mid-wash is what causes streaks.',
    },
    {
      title: 'Wet-on-wet vs wet-on-dry',
      instruction:
        'On one shape, drop color into a damp area (wet-on-wet) for soft edges. On another, paint onto dry paper (wet-on-dry) for crisp edges. Aim to control where each type of edge lands.',
      assignment: 'Photograph both studies.',
      successCriteria: [
        'Soft, diffused edges in the wet-on-wet study',
        'Crisp, defined edges in the wet-on-dry study',
        'Edges land where intended, not by accident',
      ],
      dimensions: ['medium'],
      criteria: [
        'Are the wet-on-wet edges genuinely soft and diffused?',
        'Are the wet-on-dry edges crisp and controlled?',
        'Is there evidence of intent — edges placed deliberately rather than random?',
      ],
    },
  ],
};

const watercolorColorLesson: LessonSeed = {
  title: 'Color in watercolor',
  objective: 'Mix with intent — temperature, harmony and clean color.',
  overview:
    'A limited palette makes stronger, more harmonious paintings than a big box of tubes. You will mix a range from just a few colors and then apply a deliberate temperature strategy to a small study.',
  estMinutes: 35,
  primarySkills: ['color', 'medium'],
  checkpoints: [
    {
      title: 'Limited-palette mixing chart',
      instruction:
        'Using three colors (a warm and cool of two primaries is ideal), mix a small chart: your cleanest secondaries, a warm and a cool version of one hue, and a neutral gray from complements.',
      assignment: 'Photograph the mixing chart.',
      successCriteria: [
        'Clean secondaries, not muddy',
        'A visible warm vs cool shift of one hue',
        'A believable neutral mixed from complements',
      ],
      dimensions: ['color', 'medium'],
      criteria: [
        'Are the mixed secondaries reasonably clean rather than muddy?',
        'Is there a clear warm-versus-cool temperature shift in the hue studies?',
        'Is the neutral a controlled gray mixed from complements (not black from a tube)?',
      ],
      microExerciseHint:
        'Muddy mixes usually mean too many colors — keep each mix to two, occasionally three.',
    },
    {
      title: 'Temperature study',
      instruction:
        'Paint a small study of your subject applying one temperature strategy: warm light with cool shadows (or the reverse). Keep the value structure you learned earlier intact.',
      assignment: 'Photograph the study.',
      successCriteria: [
        'A consistent temperature strategy (e.g., warm light, cool shadow)',
        'Value structure still reads clearly',
        'Color stays clean, not overworked',
      ],
      dimensions: ['color', 'value'],
      criteria: [
        'Is a consistent temperature strategy applied (warm/cool light and shadow)?',
        'Does the underlying value structure still read clearly through the color?',
        'Is the color clean and confident rather than overworked or muddy?',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Path assembly
// ---------------------------------------------------------------------------

const PATH_TITLES: Record<Category, Record<Medium, { title: string; subtitle: string }>> = {
  landscape: {
    pencil: {
      title: 'Landscape in Pencil',
      subtitle: 'Composition, depth and value — then master the graphite.',
    },
    watercolor: {
      title: 'Landscape in Watercolor',
      subtitle: 'Design the scene, then paint it with confident washes and color.',
    },
  },
  portrait: {
    pencil: {
      title: 'Portrait in Pencil',
      subtitle: 'Construction, proportion and form — rendered in graphite.',
    },
    watercolor: {
      title: 'Portrait in Watercolor',
      subtitle: 'Build the head, then paint it with controlled water and color.',
    },
  },
};

function assemble(category: Category, medium: Medium): LearningPath {
  const id = `${category}-${medium}`;
  const core = category === 'landscape' ? landscapeLessons : portraitLessons;
  const mediumSeeds =
    medium === 'pencil' ? [pencilLesson] : [watercolorWashLesson, watercolorColorLesson];
  const seeds = [...core, ...mediumSeeds];
  const lessons = seeds.map((seed, i) => buildLesson(id, i + 1, seed));
  const meta = PATH_TITLES[category][medium];
  return { id, category, medium, title: meta.title, subtitle: meta.subtitle, lessons };
}

export const LEARNING_PATHS: LearningPath[] = [
  assemble('landscape', 'pencil'),
  assemble('landscape', 'watercolor'),
  assemble('portrait', 'pencil'),
  assemble('portrait', 'watercolor'),
];

export function pathId(category: Category, medium: Medium): string {
  return `${category}-${medium}`;
}

export function getPath(id: string | null | undefined): LearningPath | undefined {
  if (!id) return undefined;
  return LEARNING_PATHS.find((p) => p.id === id);
}

export function getLesson(path: LearningPath, lessonId: string): Lesson | undefined {
  return path.lessons.find((l) => l.id === lessonId);
}

export function findLessonById(lessonId: string): { path: LearningPath; lesson: Lesson } | undefined {
  for (const path of LEARNING_PATHS) {
    const lesson = path.lessons.find((l) => l.id === lessonId);
    if (lesson) return { path, lesson };
  }
  return undefined;
}
