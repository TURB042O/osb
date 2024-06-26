import { ChatInputCommandInteraction } from 'discord.js';
import { increaseNumByPercent, reduceNumByPercent, round, Time } from 'e';
import { Bank } from 'oldschooljs';

import { calcBossFood } from '../../../lib/bso/calcBossFood';
import { gorajanArcherOutfit, pernixOutfit } from '../../../lib/data/CollectionsExport';
import { trackLoot } from '../../../lib/lootTrack';
import { calculateMonsterFood } from '../../../lib/minions/functions';
import { KillableMonster } from '../../../lib/minions/types';
import { NexMonster } from '../../../lib/nex';
import { setupParty } from '../../../lib/party';
import { MakePartyOptions } from '../../../lib/types';
import { BossActivityTaskOptions } from '../../../lib/types/minions';
import { channelIsSendable, formatDuration, isWeekend } from '../../../lib/util';
import addSubTaskToActivityTask from '../../../lib/util/addSubTaskToActivityTask';
import calcDurQty from '../../../lib/util/calcMassDurationQuantity';
import { getNexGearStats } from '../../../lib/util/getNexGearStats';
import { deferInteraction } from '../../../lib/util/interactionReply';
import { updateBankSetting } from '../../../lib/util/updateBankSetting';
import { hasMonsterRequirements } from '../../mahojiSettings';

<<<<<<< HEAD
export async function nexCommand(
	interaction: ChatInputCommandInteraction,
	user: MUser,
	channelID: string,
	solo: boolean | undefined
) {
	const channel = globalClient.channels.cache.get(channelID.toString());
	if (!channel || channel.type !== ChannelType.GuildText) return 'You need to run this in a text channel.';
=======
async function checkReqs(users: MUser[], monster: KillableMonster, quantity: number): Promise<string | undefined> {
	// Check if every user has the requirements for this monster.
	for (const user of users) {
		if (!user.user.minion_hasBought) {
			return `${user.usernameOrMention} doesn't have a minion, so they can't join!`;
		}
>>>>>>> bsopet

		if (user.minionIsBusy) {
			return `${user.usernameOrMention} is busy right now and can't join!`;
		}

		const [hasReqs, reason] = hasMonsterRequirements(user, monster);
		if (!hasReqs) {
			return `${user.usernameOrMention} doesn't have the requirements for this monster: ${reason}`;
		}

<<<<<<< HEAD
	let mahojiUsers: MUser[] = [];

	if (solo) {
		mahojiUsers = [user];
	} else {
		let usersWhoConfirmed: MUser[] = [];
		try {
			usersWhoConfirmed = await setupParty(channel as TextChannel, user, {
				minSize: 1,
				maxSize: 10,
				leader: user,
				ironmanAllowed: true,
				message: `${user} is hosting a Nex mass! Use the buttons below to join/leave.`,
				customDenier: async user => checkNexUser(await mUserFetch(user.id))
			});
		} catch (err: any) {
			return {
				content: typeof err === 'string' ? err : 'Your mass failed to start.',
				ephemeral: true
			};
		}
		usersWhoConfirmed = usersWhoConfirmed.filter(i => !i.minionIsBusy);

		if (usersWhoConfirmed.length < 1 || usersWhoConfirmed.length > 10) {
			return `${user}, your mass didn't start because it needs between 1-10 users.`;
		}
		mahojiUsers = await Promise.all(usersWhoConfirmed.map(i => mUserFetch(i.id)));
	}

	for (const user of mahojiUsers) {
		const result = checkNexUser(user);
		if (result[1]) {
			return result[1];
=======
		if (!user.owns('Frozen key')) {
			return `${user} doesn't have a Frozen key.`;
		}

		const potionsRequired = await calcBossFood(user, NexMonster, users.length, quantity);
		if (!user.bank.has(potionsRequired)) {
			return `${
				users.length === 1 ? "You don't" : `${user.usernameOrMention} doesn't`
			} have enough brews/restores. You need at least ${potionsRequired} to ${
				users.length === 1 ? 'start the mass' : 'enter the mass'
			}.`;
>>>>>>> bsopet
		}
	}
}

<<<<<<< HEAD
	const isSoloing = mahojiUsers.length === 1;

	const details = await calculateNexDetails({
		team: isSoloing ? [mahojiUsers[0], mahojiUsers[0], mahojiUsers[0], mahojiUsers[0]] : mahojiUsers
	});

	const effectiveTeam = isSoloing ? [details.team[0]] : details.team;

	for (const user of effectiveTeam) {
		const mUser = await mUserFetch(user.id);
		if (!mUser.allItemsOwned.has(user.cost)) {
			return `${mUser.usernameOrMention} doesn't have the required items: ${user.cost}.`;
=======
export async function nexCommand(
	interaction: ChatInputCommandInteraction | null,
	user: MUser,
	channelID: string,
	inputName: string,
	inputQuantity: number | undefined
) {
	if (interaction) await deferInteraction(interaction);
	const userBank = user.bank;
	if (!userBank.has('Frozen key')) {
		return `${user.minionName} attempts to enter the Ancient Prison to fight Nex, but finds a giant frozen, metal door blocking their way.`;
	}
	const type = inputName.toLowerCase().includes('mass') ? 'mass' : 'solo';

	const failureReason = await checkReqs([user], NexMonster, 2);
	if (failureReason) return failureReason;

	const partyOptions: MakePartyOptions = {
		leader: user,
		minSize: 2,
		maxSize: 8,
		ironmanAllowed: true,
		message: `${user.usernameOrMention} is doing a ${NexMonster.name} mass! Use the buttons below to join/leave.`,
		customDenier: async user => {
			if (!user.user.minion_hasBought) {
				return [true, "you don't have a minion."];
			}
			if (user.minionIsBusy) {
				return [true, 'your minion is busy.'];
			}
			const [hasReqs, reason] = hasMonsterRequirements(user, NexMonster);
			if (!hasReqs) {
				return [true, `you don't have the requirements for this monster; ${reason}`];
			}

			if (!user.hasEquippedOrInBank('Frozen key')) {
				return [true, `${user} doesn't have a Frozen key.`];
			}

			if (NexMonster.healAmountNeeded) {
				try {
					calculateMonsterFood(NexMonster, user);
				} catch (err: any) {
					return [true, err];
				}

				// Ensure people have enough food for at least 10 kills.
				// We don't want to overshoot, as the mass will still fail if there's not enough food
				const potionReq = await calcBossFood(user, NexMonster, 1, 10);
				if (!user.bank.has(potionReq)) {
					return [true, `You don't have enough food. You need at least ${potionReq} to Join the mass.`];
				}
			}

			return [false];
		}
	};

	const channel = globalClient.channels.cache.get(channelID.toString());
	if (!channelIsSendable(channel)) return 'No channel found.';
	let users: MUser[] = [];
	if (type === 'mass') {
		const usersWhoConfirmed = await setupParty(channel, user, partyOptions);
		users = usersWhoConfirmed.filter(u => !u.minionIsBusy);
	} else {
		users = [user];
	}
	let debugStr = '';
	let effectiveTime = NexMonster.timeToFinish;
	if (isWeekend()) {
		effectiveTime = reduceNumByPercent(effectiveTime, 5);
		debugStr += '5% Weekend boost\n';
	}
	const isSolo = users.length === 1;

	const soloKC = await users[0].getKC(NexMonster.id);
	if (isSolo && soloKC < 200) {
		effectiveTime = increaseNumByPercent(effectiveTime, 20);
	}

	if (isSolo && soloKC > 500) {
		effectiveTime = reduceNumByPercent(effectiveTime, 20);
	}

	for (const user of users) {
		const [data] = await getNexGearStats(
			user,
			users.map(u => u.id)
		);
		debugStr += `**${user.usernameOrMention}**: `;
		let msgs = [];

		const rangeGear = user.gear.range;
		if (rangeGear.hasEquipped(pernixOutfit, true, true)) {
			const percent = isSolo ? 20 : 8;
			effectiveTime = reduceNumByPercent(effectiveTime, percent);
			msgs.push(`${percent}% boost for full pernix`);
		} else {
			let i = 0;
			for (const inqItem of pernixOutfit) {
				if (rangeGear.hasEquipped([inqItem], true, true)) {
					const percent = isSolo ? 2.4 : 1;
					i += percent;
				}
			}
			if (i > 0) {
				msgs.push(`${i.toFixed(2)}% boost for pernix items`);
				effectiveTime = reduceNumByPercent(effectiveTime, i);
			}
		}

		if (rangeGear.hasEquipped(gorajanArcherOutfit, true, true)) {
			const perUserPercent = round(15 / users.length, 2);
			effectiveTime = reduceNumByPercent(effectiveTime, perUserPercent);
			msgs.push(`${perUserPercent}% for Gorajan archer`);
		}

		if (data.gearStats.attack_ranged < 200) {
			const percent = isSolo ? 20 : 10;
			effectiveTime = increaseNumByPercent(effectiveTime, percent);
			msgs.push(`-${percent}% penalty for <200 ranged attack`);
		}
		if (rangeGear.hasEquipped('Zaryte bow', true, true)) {
			const percent = isSolo ? 20 : 14;
			effectiveTime = reduceNumByPercent(effectiveTime, percent);
			msgs.push(`${percent}% boost for Zaryte bow`);
		} else if (rangeGear.hasEquipped('Twisted bow', true, true)) {
			const percent = isSolo ? 15 : 9;
			effectiveTime = reduceNumByPercent(effectiveTime, percent);
			msgs.push(`${percent}% boost for Twisted bow`);
		}

		// Increase duration for lower melee-strength gear.
		let rangeStrBonus = 0;
		if (data.percentRangeStrength < 40) {
			rangeStrBonus = 6;
		} else if (data.percentRangeStrength < 50) {
			rangeStrBonus = 3;
		} else if (data.percentRangeStrength < 60) {
			rangeStrBonus = 2;
		}
		if (rangeStrBonus !== 0) {
			effectiveTime = increaseNumByPercent(effectiveTime, rangeStrBonus);
			msgs.push(`-${rangeStrBonus}% penalty for ${data.percentRangeStrength}% range strength`);
		}

		// Increase duration for lower KC.
		let kcBonus = -4;
		if (data.kc < 10) {
			kcBonus = 15;
		} else if (data.kc < 25) {
			kcBonus = 5;
		} else if (data.kc < 50) {
			kcBonus = 2;
		} else if (data.kc < 100) {
			kcBonus = -2;
		}

		if (kcBonus < 0) {
			effectiveTime = reduceNumByPercent(effectiveTime, Math.abs(kcBonus));
			msgs.push(`${Math.abs(kcBonus)}% boost for KC`);
		} else {
			effectiveTime = increaseNumByPercent(effectiveTime, kcBonus);
			msgs.push(`-${kcBonus}% penalty for KC`);
		}

		if (data.kc > 500) {
			effectiveTime = reduceNumByPercent(effectiveTime, 15);
			msgs.push(`15% for ${user.usernameOrMention} over 500 kc`);
		} else if (data.kc > 300) {
			effectiveTime = reduceNumByPercent(effectiveTime, 13);
			msgs.push(`13% for ${user.usernameOrMention} over 300 kc`);
		} else if (data.kc > 200) {
			effectiveTime = reduceNumByPercent(effectiveTime, 10);
			msgs.push(`10% for ${user.usernameOrMention} over 200 kc`);
		} else if (data.kc > 100) {
			effectiveTime = reduceNumByPercent(effectiveTime, 7);
			msgs.push(`7% for ${user.usernameOrMention} over 100 kc`);
		} else if (data.kc > 50) {
			effectiveTime = reduceNumByPercent(effectiveTime, 5);
			msgs.push(`5% for ${user.usernameOrMention} over 50 kc`);
		}

		debugStr += `${msgs.join(', ')}. `;
	}

	let minDuration = 2;
	if (users.length === 4) minDuration = 1.5;
	if (users.length === 5) minDuration = 1.2;
	if (users.length >= 6) minDuration = 1;

	let durQtyRes = await calcDurQty(
		users,
		{ ...NexMonster, timeToFinish: effectiveTime },
		inputQuantity,
		Time.Minute * minDuration,
		Time.Minute * 30
	);
	if (typeof durQtyRes === 'string') return durQtyRes;
	let [quantity, duration, perKillTime] = durQtyRes;
	const secondCheck = await checkReqs(users, NexMonster, quantity);
	if (secondCheck) return secondCheck;

	let foodString = 'Removed brews/restores from users: ';
	let foodRemoved: string[] = [];
	for (const user of users) {
		const food = await calcBossFood(user, NexMonster, users.length, quantity);
		if (!user.bank.has(food)) {
			return `${user.usernameOrMention} doesn't have enough brews or restores.`;
>>>>>>> bsopet
		}
	}

	const removeResult = await Promise.all(
<<<<<<< HEAD
		effectiveTeam.map(async i => {
			const klasaUser = await mUserFetch(i.id);
=======
		users.map(async user => {
			const cost = await calcBossFood(user, NexMonster, users.length, quantity);
			foodRemoved.push(`${cost} from ${user.usernameOrMention}`);
			await user.removeItemsFromBank(cost);
>>>>>>> bsopet
			return {
				id: user.id,
				cost
			};
		})
	);

	const totalCost = new Bank();
	for (const u of removeResult) totalCost.add(u.cost);

<<<<<<< HEAD
	await Promise.all([
		await updateBankSetting('nex_cost', totalCost),
		await trackLoot({
			totalCost,
			id: 'nex',
			type: 'Monster',
			changeType: 'cost',
			users: removeResult.map(i => ({
				id: i.id,
				cost: i.cost
			}))
		})
	]);

	await addSubTaskToActivityTask<NexTaskOptions>({
		userID: user.id,
		channelID: channelID.toString(),
		duration: details.duration,
		type: 'Nex',
		leader: user.id,
		users: effectiveTeam.map(i => i.id),
		userDetails: effectiveTeam.map(i => [i.id, i.contribution, i.deaths]),
		fakeDuration: details.fakeDuration,
		quantity: details.quantity,
		wipedKill: details.wipedKill
	});

	let str = `${user.usernameOrMention}'s party (${mahojiUsers
		.map(u => u.usernameOrMention)
		.join(', ')}) is now off to kill ${details.quantity}x Nex! (${calcPerHour(
		details.quantity,
		details.fakeDuration
	).toFixed(1)}/hr) - the total trip will take ${formatDuration(details.fakeDuration)}.

${effectiveTeam
	.map(i => {
		return `${userMention(i.id)}: Contrib[${i.contribution.toFixed(2)}%] Death[${i.deathChance.toFixed(
			2
		)}%] Offence[${Math.round(i.totalOffensivePecent)}%] Defence[${Math.round(
			i.totalDefensivePercent
		)}%] *${i.messages.join(', ')}*`;
	})
	.join('\n')}
`;
=======
	await trackLoot({
		changeType: 'cost',
		totalCost,
		id: NexMonster.name,
		type: 'Monster',
		users: removeResult.map(i => ({
			id: i.id,
			cost: i.cost
		}))
	});

	foodString += `${foodRemoved.join(', ')}.`;

	await addSubTaskToActivityTask<BossActivityTaskOptions>({
		userID: user.id,
		channelID: channelID.toString(),
		quantity,
		duration,
		type: 'Nex',
		users: users.map(u => u.id)
	});

	updateBankSetting('nex_cost', totalCost);

	let str =
		type === 'solo'
			? `Your minion is now attempting to kill ${quantity}x Nex. ${foodString} The trip will take ${formatDuration(
					duration
			  )}.`
			: `${partyOptions.leader.usernameOrMention}'s party (${users
					.map(u => u.usernameOrMention)
					.join(', ')}) is now off to kill ${quantity}x ${NexMonster.name}. Each kill takes ${formatDuration(
					perKillTime
			  )} instead of ${formatDuration(NexMonster.timeToFinish)} - the total trip will take ${formatDuration(
					duration
			  )}. ${foodString}`;

	str += ` \n\n${debugStr}`;
>>>>>>> bsopet

	return str;
}
