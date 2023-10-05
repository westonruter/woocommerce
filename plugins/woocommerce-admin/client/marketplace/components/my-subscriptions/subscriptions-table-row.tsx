/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { TableRow } from '@woocommerce/components/build-types/table/types';
import { Icon, plugins } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { Subscription } from './types';
import DefaultProductIcon from '../../assets/images/default-product-icon.svg';
import StatusPopover from './status-popover';
import ActivationToggle from './activation-toggle';
import ActionsDropdownMenu from './actions-dropdown-menu';

export default function tableRow( item: Subscription ): TableRow[] {
	const getStatus = (
		subscription: Subscription
	): { text: string; warning: boolean; explanation?: string } => {
		// TODO add statuses for subscriptions
		if ( subscription.active ) {
			return {
				text: __( 'Active', 'woocommerce' ),
				warning: false,
			};
		}

		if ( subscription.product_key === '' ) {
			return {
				text: __( 'Not found', 'woocommerce' ),
				warning: true,
			};
		}

		if ( subscription.expired ) {
			return {
				text: __( 'Expired', 'woocommerce' ),
				warning: true,
			};
		}

		return {
			text: __( 'Inactive', 'woocommerce' ),
			warning: true,
			explanation: __(
				'This subscription is not active.',
				'woocommerce'
			),
		};
	};

	const getVersion = ( subscription: Subscription ): string => {
		if ( subscription.local.version === subscription.version ) {
			return subscription.local.version;
		}

		if ( subscription.local.version && subscription.version ) {
			return subscription.local.version + ' > ' + subscription.version;
		}

		if ( subscription.version ) {
			return subscription.version;
		}

		if ( subscription.local.version ) {
			return subscription.local.version;
		}

		return '';
	};

	function productName( subscription: Subscription ): TableRow {
		// This is the fallback icon element with products without an icon.
		let iconElement = <Icon icon={ plugins } size={ 40 } />;

		// If the product has an icon, use that instead.
		if ( subscription.product_icon !== '' ) {
			iconElement = (
				<img
					src={ subscription.product_icon ?? DefaultProductIcon }
					alt={ sprintf(
						/* translators: %s is the product name. */
						__( '%s icon', 'woocommerce' ),
						subscription.product_name
					) }
				/>
			);
		}

		const displayElement = (
			<div className="woocommerce-marketplace__my-subscriptions__product">
				{ iconElement }
				<span className="woocommerce-marketplace__my-subscriptions__product-name">
					{ subscription.product_name }
				</span>
			</div>
		);

		return {
			display: displayElement,
			value: subscription.product_name,
		};
	}

	function status( subscription: Subscription ): TableRow {
		const subscriptionStatus = getStatus( subscription );

		let statusElement = <>{ subscriptionStatus.text }</>;

		if ( subscriptionStatus.warning ) {
			statusElement = (
				<StatusPopover
					text={ subscriptionStatus.text }
					explanation={ subscriptionStatus.explanation ?? '' }
				/>
			);
		}

		const displayElement = (
			<span className="woocommerce-marketplace__my-subscriptions__status">
				{ statusElement }
			</span>
		);

		return {
			display: displayElement,
			value: subscriptionStatus.text,
		};
	}

	function expiry( subscription: Subscription ): TableRow {
		const expiryDate = subscription.expires;

		let expiryDateElement = __( 'Never expires', 'woocommerce' );

		if ( expiryDate ) {
			// TODO: Convert date using whetever the rest of WC Admin is using.
			expiryDateElement = new Date(
				expiryDate * 1000
			).toLocaleDateString( undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			} );
		}

		const displayElement = (
			<span className="woocommerce-marketplace__my-subscriptions__expiry-date">
				{ expiryDateElement }
			</span>
		);

		return {
			display: displayElement,
			value: expiryDate,
		};
	}

	function autoRenew( subscription: Subscription ): TableRow {
		return {
			display: subscription.autorenew ? 'true' : 'false',
			value: subscription.autorenew,
		};
	}

	function version( subscription: Subscription ): TableRow {
		return {
			display: getVersion( subscription ),
		};
	}

	function activation( subscription: Subscription ): TableRow {
		const displayElement = (
			<ActivationToggle checked={ subscription.autorenew } />
		);

		return {
			display: displayElement,
		};
	}

	function actions(): TableRow {
		return {
			display: <ActionsDropdownMenu />,
		};
	}

	return [
		productName( item ),
		status( item ),
		expiry( item ),
		autoRenew( item ),
		version( item ),
		activation( item ),
		actions(),
	];
}
