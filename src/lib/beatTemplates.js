// Popular scene-mappable story-structure templates, used to bulk-tag
// existing scenes with an act + beat label in the Plot Grid.
export const BEAT_TEMPLATES = [
  {
    id: 'three-act',
    label: 'Three-Act Structure',
    description: 'The classic setup / confrontation / resolution shape underlying most commercial fiction.',
    beats: [
      { act: 1, beat: 'Setup' },
      { act: 1, beat: 'Inciting Incident' },
      { act: 1, beat: 'Plot Point 1' },
      { act: 2, beat: 'Rising Action' },
      { act: 2, beat: 'Midpoint' },
      { act: 2, beat: 'Plot Point 2' },
      { act: 3, beat: 'Climax' },
      { act: 3, beat: 'Resolution' },
    ],
  },
  {
    id: 'save-the-cat',
    label: 'Save the Cat! (15 Beats)',
    description: "Blake Snyder's 15-beat sheet — widely used across both novels and screenplays.",
    beats: [
      { act: 1, beat: 'Opening Image' },
      { act: 1, beat: 'Theme Stated' },
      { act: 1, beat: 'Set-Up' },
      { act: 1, beat: 'Catalyst' },
      { act: 1, beat: 'Debate' },
      { act: 1, beat: 'Break into Two' },
      { act: 2, beat: 'B Story' },
      { act: 2, beat: 'Fun and Games' },
      { act: 2, beat: 'Midpoint' },
      { act: 2, beat: 'Bad Guys Close In' },
      { act: 2, beat: 'All Is Lost' },
      { act: 2, beat: 'Dark Night of the Soul' },
      { act: 3, beat: 'Break into Three' },
      { act: 3, beat: 'Finale' },
      { act: 3, beat: 'Final Image' },
    ],
  },
  {
    id: 'heros-journey',
    label: "Hero's Journey (12 Stages)",
    description: "Campbell/Vogler's monomyth — a common fit for quest and coming-of-age arcs.",
    beats: [
      { act: 1, beat: 'Ordinary World' },
      { act: 1, beat: 'Call to Adventure' },
      { act: 1, beat: 'Refusal of the Call' },
      { act: 1, beat: 'Meeting the Mentor' },
      { act: 1, beat: 'Crossing the Threshold' },
      { act: 2, beat: 'Tests, Allies, Enemies' },
      { act: 2, beat: 'Approach to the Inmost Cave' },
      { act: 2, beat: 'Ordeal' },
      { act: 2, beat: 'Reward' },
      { act: 3, beat: 'The Road Back' },
      { act: 3, beat: 'Resurrection' },
      { act: 3, beat: 'Return with the Elixir' },
    ],
  },
];

export const ACT_COLORS = {
  1: '#2c4a6e',
  2: '#8b5a2b',
  3: '#5a7a3e',
};

// Spreads a template's beats proportionally across however many scenes exist.
export function distributeBeats(template, sceneCount) {
  return Array.from({ length: sceneCount }, (_, i) => {
    const idx = Math.min(
      template.beats.length - 1,
      Math.floor((i * template.beats.length) / sceneCount)
    );
    return template.beats[idx];
  });
}
