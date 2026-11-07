export const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const prepositions = ['in', 'on', 'behind', 'under', 'into'];

export const dropZones = [
  { id: 'fridge', name: 'Fridge', prepositions: ['into'], icon: '🧊', spokenTarget: 'the fridge' },
  { id: 'sink', name: 'Sink', prepositions: ['in'], icon: '🚰', spokenTarget: 'the sink' },
  { id: 'table_on', name: 'Table', prepositions: ['on'], icon: '🪵', spokenTarget: 'the table' },
  { id: 'table_under', name: 'Table', prepositions: ['under'], icon: '🪵', spokenTarget: 'the table' },
  { id: 'plate', name: 'Plate', prepositions: ['on'], icon: '🍽️', spokenTarget: 'the plate' },
  { id: 'cabinet_in', name: 'Cabinet', prepositions: ['in'], icon: '🗄️', spokenTarget: 'the cabinet' },
  { id: 'cabinet_behind', name: 'Cabinet', prepositions: ['behind'], icon: '🗄️', spokenTarget: 'the cabinet' },
  { id: 'box', name: 'Box', prepositions: ['in'], icon: '📦', spokenTarget: 'the box' },
  { id: 'shelf', name: 'Shelf', prepositions: ['on'], icon: '🪜', spokenTarget: 'the shelf' }
];

export const nouns = [
  // Short A
  { 
    id: 'pan', 
    label: 'pan', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><ellipse cx="16" cy="18" rx="12" ry="8" fill="#374151"/><ellipse cx="16" cy="17" rx="10" ry="6.5" fill="#1f2937"/><rect x="26" y="16" width="9" height="3" rx="1.5" fill="#4b5563"/></svg>`, 
    validTargets: [{ zone: 'sink', prep: 'in' }, { zone: 'table_on', prep: 'on' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'can', 
    label: 'can', 
    icon: '🥫', 
    validTargets: [{ zone: 'fridge', prep: 'into' }, { zone: 'cabinet_in', prep: 'in' }, { zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'rag', 
    label: 'rag', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><path d="M6 10 L26 8 L30 26 L8 28 Z" fill="#f59e0b" opacity="0.9"/><path d="M8 14 L28 12 M9 20 L29 18" stroke="#d97706" stroke-width="1.5" stroke-dasharray="2,2"/></svg>`, 
    validTargets: [{ zone: 'sink', prep: 'in' }, { zone: 'table_on', prep: 'on' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'bag', 
    label: 'bag', 
    icon: '🛍️', 
    validTargets: [{ zone: 'table_on', prep: 'on' }, { zone: 'table_under', prep: 'under' }, { zone: 'cabinet_in', prep: 'in' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'cap', 
    label: 'cap', 
    icon: '🧢', 
    validTargets: [{ zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'hat', 
    label: 'hat', 
    icon: '👒', 
    validTargets: [{ zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }, { zone: 'cabinet_in', prep: 'in' }] 
  },

  // Short E
  { 
    id: 'pen', 
    label: 'pen', 
    icon: '🖊️', 
    validTargets: [{ zone: 'table_on', prep: 'on' }, { zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'leg', 
    label: 'leg', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><path d="M12 6 C16 6 18 10 18 16 L18 26 C18 29 23 29 24 31 C24 33 16 33 14 30 L13 18 Z" fill="#fdba74" stroke="#ea580c" stroke-width="1.2"/><circle cx="15" cy="8" r="2.5" fill="#fed7aa" stroke="#ea580c"/></svg>`, 
    validTargets: [{ zone: 'box', prep: 'in' }, { zone: 'table_under', prep: 'under' }] 
  },
  { 
    id: 'bed', 
    label: 'bed', 
    icon: '🛏️', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'hen', 
    label: 'hen', 
    icon: '🐔', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'jet', 
    label: 'jet', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><path d="M18 4 L22 14 L32 18 L22 22 L20 30 L18 28 L19 22 L17 22 L16 26 L14 26 L15 20 L4 18 L14 14 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/></svg>`, 
    validTargets: [{ zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }, { zone: 'table_on', prep: 'on' }] 
  },
  { 
    id: 'pet', 
    label: 'pet', 
    icon: '🐾', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'box', prep: 'in' }] 
  },

  // Short I
  { 
    id: 'lid', 
    label: 'lid', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><ellipse cx="18" cy="20" rx="14" ry="6" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/><circle cx="18" cy="14" r="3" fill="#334155"/></svg>`, 
    validTargets: [{ zone: 'sink', prep: 'in' }, { zone: 'table_on', prep: 'on' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'bin', 
    label: 'bin', 
    icon: '🗑️', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'cabinet_behind', prep: 'behind' }] 
  },
  { 
    id: 'pig', 
    label: 'pig', 
    icon: '🐷', 
    validTargets: [{ zone: 'box', prep: 'in' }, { zone: 'shelf', prep: 'on' }, { zone: 'table_under', prep: 'under' }] 
  },
  { 
    id: 'mix', 
    label: 'mix', 
    icon: '🥣', 
    validTargets: [{ zone: 'cabinet_in', prep: 'in' }, { zone: 'shelf', prep: 'on' }, { zone: 'table_on', prep: 'on' }] 
  },
  { 
    id: 'wig', 
    label: 'wig', 
    icon: '🦳', 
    validTargets: [{ zone: 'box', prep: 'in' }, { zone: 'shelf', prep: 'on' }, { zone: 'cabinet_in', prep: 'in' }] 
  },

  // Short O
  { 
    id: 'pot', 
    label: 'pot', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><rect x="8" y="14" width="20" height="14" rx="3" fill="#64748b" stroke="#334155" stroke-width="1.5"/><rect x="4" y="16" width="4" height="2" rx="1" fill="#334155"/><rect x="28" y="16" width="4" height="2" rx="1" fill="#334155"/><ellipse cx="18" cy="14" rx="10" ry="2.5" fill="#475569"/></svg>`, 
    validTargets: [{ zone: 'sink', prep: 'in' }, { zone: 'table_on', prep: 'on' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'mop', 
    label: 'mop', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><line x1="8" y1="6" x2="22" y2="22" stroke="#b45309" stroke-width="3" stroke-linecap="round"/><path d="M20 20 L27 27 C29 31 23 34 20 30 Z" fill="#93c5fd" stroke="#2563eb" stroke-width="1"/></svg>`, 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'cabinet_behind', prep: 'behind' }] 
  },
  { 
    id: 'box', 
    label: 'box', 
    icon: '📦', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'shelf', prep: 'on' }] 
  },
  { 
    id: 'dog', 
    label: 'dog', 
    icon: '🐶', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'fox', 
    label: 'fox', 
    icon: '🦊', 
    validTargets: [{ zone: 'table_under', prep: 'under' }, { zone: 'box', prep: 'in' }] 
  },

  // Short U
  { 
    id: 'cup', 
    label: 'cup', 
    icon: '🥤', 
    validTargets: [{ zone: 'table_on', prep: 'on' }, { zone: 'plate', prep: 'on' }, { zone: 'sink', prep: 'in' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'mug', 
    label: 'mug', 
    icon: '☕', 
    validTargets: [{ zone: 'table_on', prep: 'on' }, { zone: 'plate', prep: 'on' }, { zone: 'sink', prep: 'in' }, { zone: 'cabinet_in', prep: 'in' }] 
  },
  { 
    id: 'jug', 
    label: 'jug', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><path d="M12 12 Q10 28 14 30 L24 30 Q28 28 26 12 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/><path d="M25 15 C29 16 29 24 24 25" fill="none" stroke="#0284c7" stroke-width="2"/><path d="M11 12 Q14 10 18 10 Q22 10 27 12" stroke="#0284c7" stroke-width="1.5" fill="none"/></svg>`, 
    validTargets: [{ zone: 'fridge', prep: 'into' }, { zone: 'table_on', prep: 'on' }, { zone: 'sink', prep: 'in' }] 
  },
  { 
    id: 'bun', 
    label: 'bun', 
    icon: '🥯', 
    validTargets: [{ zone: 'plate', prep: 'on' }, { zone: 'table_on', prep: 'on' }, { zone: 'box', prep: 'in' }] 
  },
  { 
    id: 'rug', 
    label: 'rug', 
    icon: `<svg viewBox="0 0 36 36" width="36" height="36"><rect x="6" y="11" width="24" height="14" rx="2" fill="#c084fc" stroke="#7e22ce" stroke-width="1.5"/><line x1="4" y1="13" x2="6" y2="13" stroke="#581c87" stroke-width="1.5"/><line x1="4" y1="23" x2="6" y2="23" stroke="#581c87" stroke-width="1.5"/><line x1="30" y1="13" x2="32" y2="13" stroke="#581c87" stroke-width="1.5"/><line x1="30" y1="23" x2="32" y2="23" stroke="#581c87" stroke-width="1.5"/></svg>`, 
    validTargets: [{ zone: 'table_under', prep: 'under' }] 
  },
  { 
    id: 'nut', 
    label: 'nut', 
    icon: '🥜', 
    validTargets: [{ zone: 'plate', prep: 'on' }, { zone: 'shelf', prep: 'on' }, { zone: 'box', prep: 'in' }, { zone: 'fridge', prep: 'into' }] 
  }
];

export function pluralize(label, count) {
  if (count === 1) return label;
  if (label.endsWith('x') || label.endsWith('s')) return `${label}es`;
  return `${label}s`;
}

export function generateMission() {
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const target = noun.validTargets[Math.floor(Math.random() * noun.validTargets.length)];
  const zone = dropZones.find((z) => z.id === target.zone) || dropZones[0];
  const preposition = target.prep;
  const count = numbers[Math.floor(Math.random() * numbers.length)];

  const nounLabel = pluralize(noun.label, count);
  const sentenceText = `Put ${count} ${nounLabel} ${preposition} ${zone.spokenTarget}.`;

  return {
    noun,
    count,
    preposition,
    zoneId: zone.id,
    sentenceText
  };
}
