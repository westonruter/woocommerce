/**
 * External dependencies
 */
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './content.scss';
import Discover from '../discover/discover';
import Extensions from '../extensions/extensions';
import MySubscriptions from '../my-subscriptions/my-subscriptions';
import { MarketplaceContext } from '../../contexts/marketplace-context';
import { SubscriptionsContextProvider } from '../../contexts/subscriptions-context';

const renderContent = ( selectedTab?: string ): JSX.Element => {
	switch ( selectedTab ) {
		case 'extensions':
			return <Extensions />;
		case 'my-subscriptions':
			return (
				<SubscriptionsContextProvider>
					<MySubscriptions />
				</SubscriptionsContextProvider>
			);
		default:
			return <Discover />;
	}
};

export default function Content(): JSX.Element {
	const marketplaceContextValue = useContext( MarketplaceContext );
	const { selectedTab } = marketplaceContextValue;
	return (
		<div className="woocommerce-marketplace__content">
			{ renderContent( selectedTab ) }
		</div>
	);
}
