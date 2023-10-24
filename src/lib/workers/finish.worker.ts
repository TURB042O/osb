import '../../lib/customItems/customItems';
import '../data/itemAliases';

import { removeFromArr } from 'e';
import { Bank } from 'oldschooljs';

import getOSItem from '../util/getOSItem';
import type { FinishWorkerArgs, FinishWorkerReturn } from '.';

export default async ({ name, tertiaries }: FinishWorkerArgs): FinishWorkerReturn => {
	const { finishables } = await import('../finishables');
	const val = finishables.find(i => i.name === name)!;
	let finishCL = [...val.cl];
	if (val.tertiaryDrops && !tertiaries) {
		for (const { itemId } of val.tertiaryDrops) {
			finishCL = removeFromArr(finishCL, itemId);
		}
	}
	let loot = new Bank();
	const kcBank = new Bank();
	let kc = 0;
	const maxAttempts = val.maxAttempts ?? 100_000;
	for (let i = 0; i < maxAttempts; i++) {
		if (finishCL.every(id => loot.has(id))) break;
		kc++;
		const thisLoot = val.kill({ accumulatedLoot: loot, totalRuns: i });

		if (tertiaries && val.tertiaryDrops) {
			for (const drop of val.tertiaryDrops) {
				if (kc === drop.kcNeeded) {
					thisLoot.add(drop.itemId);
				}
			}
		}

		const purpleItems = thisLoot.items().filter(i => finishCL.includes(i[0].id) && !loot.has(i[0].id));
		for (const p of purpleItems) kcBank.add(p[0].id, kc);
		loot.add(thisLoot);
		if (kc === maxAttempts) {
			return `After ${maxAttempts.toLocaleString()} KC, you still didn't finish the CL, so we're giving up! Missing: ${finishCL
				.filter(id => !loot.has(id))
				.map(getOSItem)
				.map(i => i.name)
				.join(', ')}`;
		}
	}
	return { kc, kcBank: kcBank.bank, loot: loot.bank };
};
