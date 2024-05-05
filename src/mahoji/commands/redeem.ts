import { bold } from '@discordjs/builders';
import { ProductID, products } from '@oldschoolgg/toolkit';
import { notEmpty, Time } from 'e';
import { ApplicationCommandOptionType, CommandRunOptions } from 'mahoji';

import { BOT_TYPE } from '../../lib/constants';
import { addToDoubleLootTimer } from '../../lib/doubleLoot';
import { roboChimpSyncData } from '../../lib/roboChimp';
import { OSBMahojiCommand } from '../lib/util';

export const redeemCommand: OSBMahojiCommand = {
	name: 'redeem',
	description: 'Redeem a code you received.',
	attributes: {
		cooldown: 10
	},
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'code',
			description: 'The code to redeem.',
			required: true
		}
	],
	run: async ({ options, userID }: CommandRunOptions<{ code: string }>) => {
		const user = await mUserFetch(userID);
		const code = await roboChimpClient.storeCode.findFirst({
			where: {
				code: options.code
			}
		});
		if (!code) {
			return 'That code is invalid.';
		}
		if (code.redeemed_at) {
			return 'That code has already been redeemed.';
		}

		const product = products.find(p => p.id === code.product_id);
		if (!product) {
			throw new Error('Invalid product ID.');
		}
		await roboChimpSyncData(user);
		if (product.type === 'bit' && user.user.store_bitfield.includes(product.id)) {
			return 'You already have this, redeeming it again would be a waste!';
		}

		if (BOT_TYPE === 'OSB') {
			if (product.type === 'active') {
				switch (product.id) {
					case ProductID.OneHourDoubleLoot: {
						return 'You cannot redeem this on OSB.';
					}
					case ProductID.ThreeHourDoubleLoot: {
						return 'You cannot redeem this on OSB.';
					}
				}
			}
		}

		await roboChimpClient.$transaction(
			[
				roboChimpClient.storeCode.update({
					where: {
						code: options.code
					},
					data: {
						redeemed_at: new Date(),
						redeemed_by_user_id: user.id
					}
				}),
				'bit' in product
					? roboChimpClient.user.update({
							where: {
								id: BigInt(userID)
							},
							data: {
								store_bitfield: {
									push: product.bit
								}
							}
					  })
					: undefined
			].filter(notEmpty)
		);

		if (BOT_TYPE === 'BSO') {
			if (product.type === 'active') {
				switch (product.id) {
					case ProductID.OneHourDoubleLoot: {
						await addToDoubleLootTimer(Time.Hour, `Purchased by ${user}`);
						break;
					}
					case ProductID.ThreeHourDoubleLoot: {
						await addToDoubleLootTimer(Time.Hour * 3, `Purchased by ${user}`);
						break;
					}
				}
			}
		}

		await roboChimpSyncData(user);

		return `You have redeemed: ${bold(product.name)}!`;
	}
};
