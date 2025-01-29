export type Modifier = {
	// Modifier value
	value: number;

	// Modifier description
	description: string;
};

// Difficulty Check struct
export type DC = {
	// Which action is being checked
	action: string;

	// Ability
	ability: string;

	// Difficulty
	difficulty: number;

	// Additional information
	information?: string;

	// Modifiers
	modifiers: Modifier[];
};

export const defaultDC: DC = {
	action: '위협',
	ability: '매력',
	difficulty: 15,
	modifiers: [
		{
			value: 1,
			description: '매력',
		},
	],
};

export const dcToString = (dc: DC) => {
	const modString = dc.modifiers
		.map((m) => {
			if (m.value >= 0) {
				return `+${m.value} ${m.description}`;
			}
			return `${m.value} ${m.description}`;
		})
		.join(', ');

	return `${dc.action}(${dc.ability}) ${dc.difficulty} (${modString})`;
};
