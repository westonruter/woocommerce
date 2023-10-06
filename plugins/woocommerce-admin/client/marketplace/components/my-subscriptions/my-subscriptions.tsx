/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button, Tooltip } from '@wordpress/components';
import { getNewPath, useQuery } from '@woocommerce/navigation';
import { help } from '@wordpress/icons';
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getAdminSetting } from '../../../utils/admin-settings';
import { Subscription } from './types';
import './my-subscriptions.scss';
import SubscriptionsTable from './subscriptions-table';
import SubscriptionsTableRow from './subscriptions-table-row';
import { SubscriptionsContext } from '../../contexts/subscriptions-context';

export default function MySubscriptions(): JSX.Element {
	const { subscriptions, isLoading } = useContext( SubscriptionsContext );

	const tableHeadersDefault = [
		{
			key: 'name',
			label: __( 'Name', 'woocommerce' ),
		},
		{
			key: 'status',
			label: __( 'Status', 'woocommerce' ),
		},
		{
			key: 'expiry',
			label: __( 'Expiry/Renewal date', 'woocommerce' ),
		},
		{
			key: 'autoRenew',
			label: __( 'Auto-renew', 'woocommerce' ),
		},
		{
			key: 'version',
			label: __( 'Version', 'woocommerce' ),
			isNumeric: true,
		},
	];

	const tableHeadersAvailable = [
		...tableHeadersDefault,
		{
			key: 'install',
			label: __( 'Install', 'woocommerce' ),
		},
		{
			key: 'actions',
			label: __( 'Actions', 'woocommerce' ),
		},
	];

	const tableHeadersInstalled = [
		...tableHeadersDefault,
		{
			key: 'activated',
			label: __( 'Activated', 'woocommerce' ),
		},
		{
			key: 'actions',
			label: __( 'Actions', 'woocommerce' ),
		},
	];

	const updateConnectionUrl = getNewPath(
		{
			page: 'wc-addons',
			section: 'helper',
			filter: 'all',
			'wc-helper-refresh': 1,
			'wc-helper-nonce': getAdminSetting( 'wc_helper_nonces' ).refresh,
		},
		''
	);
	const updateConnectionHTML = sprintf(
		// translators: %s is a link to the update connection page.
		__(
			'If you don\'t see your subscription, try <a href="%s">updating</a> your connection.',
			'woocommerce'
		),
		updateConnectionUrl
	);

	const subscriptionsInstalled: Array< Subscription > = subscriptions.filter(
		( subscription: Subscription ) => subscription.local.installed
	);

	const subscriptionsAvailable: Array< Subscription > = subscriptions.filter(
		( subscription: Subscription ) =>
			! subscriptionsInstalled.includes( subscription )
	);

	return (
		<div className="woocommerce-marketplace__my-subscriptions">
			<section>
				<h2>{ __( 'Installed on this store', 'woocommerce' ) }</h2>
				<p>
					<span
						dangerouslySetInnerHTML={ {
							__html: updateConnectionHTML,
						} }
					/>
					<Tooltip
						text={
							<>
								<h3>
									{ __(
										"Still don't see your subscription?",
										'woocommerce'
									) }
								</h3>
								<p
									dangerouslySetInnerHTML={ {
										__html: __(
											'To see all your subscriptions go to <a href="https://woocommerce.com/my-account/" target="_blank" class="woocommerce-marketplace__my-subscriptions__tooltip-external-link">your account</a> on WooCommerce.com.',
											'woocommerce'
										),
									} }
								/>
							</>
						}
					>
						<Button
							icon={ help }
							iconSize={ 20 }
							isSmall={ true }
							label={ __( 'Help', 'woocommerce' ) }
						/>
					</Tooltip>
				</p>
				<SubscriptionsTable
					isLoading={ isLoading }
					headers={ tableHeadersInstalled }
					rows={ subscriptionsInstalled.map( ( item ) => {
						return SubscriptionsTableRow( item );
					} ) }
				/>
			</section>

			<section>
				<h2>{ __( 'Available', 'woocommerce' ) }</h2>
				<p>
					{ __(
						'Your unused and free WooCommerce.com subscriptions.',
						'woocommerce'
					) }
				</p>
				<SubscriptionsTable
					isLoading={ isLoading }
					headers={ tableHeadersAvailable }
					rows={ subscriptionsAvailable.map( ( item ) => {
						return SubscriptionsTableRow( item );
					} ) }
				/>
			</section>
		</div>
	);
}
