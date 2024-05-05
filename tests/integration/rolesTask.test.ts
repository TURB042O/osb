import { Time } from 'e';
import { Bank } from 'oldschooljs';
import { describe, expect, test } from 'vitest';

import { runRolesTask } from '../../src/lib/rolesTask';
import { MinigameName, Minigames } from '../../src/lib/settings/minigames';
import { cryptoRand } from '../../src/lib/util';
import { userStatsBankUpdate } from '../../src/mahoji/mahojiSettings';
import { createTestUser, mockedId } from './util';

describe('Roles Task', async () => {
	test('Should not throw', async () => {
		const user = await createTestUser();
		await userStatsBankUpdate(user.id, 'sacrificed_bank', new Bank().add('Coal', 10_000));
		await userStatsBankUpdate(user.id, 'openable_scores', new Bank().add('Tradeable mystery box', 10_000));
		await user.update({
			monkeys_fought: ['a'],
			disassembled_items_bank: new Bank().add('Twisted bow').bank,
			skills_invention: 1000
		});
		const ironUser = await createTestUser();
		await ironUser.update({ minion_ironman: true, sacrificedValue: 1_000_000 });
		await userStatsBankUpdate(ironUser.id, 'sacrificed_bank', new Bank().add('Coal', 10_000));

		// Create minigame scores:
		const minigames = Minigames.map(game => game.column).filter(i => i !== 'tithe_farm');
		const minigameUpdate: { [K in MinigameName]?: number } = {};
		for (const minigame of minigames) {
			minigameUpdate[minigame] = 1000;
		}
		await global.prisma!.minigame.upsert({
			where: { user_id: ironUser.id },
			update: minigameUpdate,
			create: { user_id: ironUser.id, ...minigameUpdate }
		});

		await global.prisma!.giveaway.create({
			data: {
				user_id: user.id,
				loot: { 995: 10_000 },
				start_date: new Date(),
				finish_date: new Date(Date.now() + Time.Hour),
				channel_id: '792691343284764693',
				message_id: mockedId(),
				reaction_id: mockedId(),
				users_entered: [],
				id: cryptoRand(1, 10_000_000),
				completed: false,
				duration: 10_000
			}
		});
		const result = await runRolesTask();
		expect(result).toBeTruthy();
		expect(result).includes('Roles');
	});
});
