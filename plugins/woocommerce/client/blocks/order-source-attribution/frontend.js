/**
 * External dependencies
 */
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */


/**
 *
 * @param checkoutExtensionData
 * @returns {null}
 * @constructor
 */
export const Frontend = ({ checkoutExtensionData }) => {
	const { setExtensionData } = checkoutExtensionData
	let sb = {};

	useEffect(() => {
		setExtensionData(
			'order-source',
			'sb-referrer',
			sb.referrer
		)
	})

	return null;
}
