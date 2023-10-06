/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button, Icon, ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { getNewPath, navigateTo } from '@woocommerce/navigation';

/**
 * Internal dependencies
 */
import { Subscription } from './types';
import { installProduct } from '../../utils/functions';

interface ActivationToggleProps {
	subscription: Subscription;
}

export default function ActivationToggle( props: ActivationToggleProps ) {
	const [ loading, setLoading ] = useState( false );
	const { createErrorNotice, createSuccessNotice } =
		useDispatch( 'core/notices' );

	const reloadSubscriptions = () => {
		// Temporary solution to reload the subscriptions list.
		navigateTo( {
			url: getNewPath( {
				reload: Math.random().toString( 36 ).substring( 7 ),
			} ),
		} );
	};

	const install = () => {
		setLoading( true );
		installProduct( props.subscription.product_id )
			.then( () => {
				reloadSubscriptions();
				createSuccessNotice(
					sprintf(
						// translators: %s is the product name.
						__( '%s successfully installed.', 'woocommerce' ),
						props.subscription.product_name
					),
					{
						isDismissible: true,
						icon: <Icon icon="yes" />,
					}
				);
			} )
			.catch( () => {
				createErrorNotice(
					sprintf(
						// translators: %s is the product name.
						__( '%s couldn’t be installed.', 'woocommerce' ),
						props.subscription.product_name
					),
					{
						isDismissible: true,
						icon: <Icon icon="warning" />,
						actions: [
							{
								label: __( 'Try again', 'woocommerce' ),
								onClick: install,
							},
						],
					}
				);
			} )
			.finally( () => {
				setLoading( false );
			} );
	};

	const toggleActivation = () => {
		setLoading( true );
	};

	if ( props.subscription.local.installed === false ) {
		return (
			<Button
				variant="primary"
				isBusy={ loading }
				disabled={ loading }
				onClick={ install }
			>
				{ __( 'Install', 'woocommerce' ) }
			</Button>
		);
	}

	return (
		<ToggleControl
			checked={ props.subscription.active }
			onClick={ toggleActivation }
			disabled={ loading }
		/>
	);
}
