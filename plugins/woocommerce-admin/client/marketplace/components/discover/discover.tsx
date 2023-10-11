/**
 * External dependencies
 */
import { useContext, useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ProductList from '../product-list/product-list';
import { fetchDiscoverPageData, ProductGroup } from '../../utils/functions';
import ProductLoader from '../product-loader/product-loader';
import { MarketplaceContext } from '../../contexts/marketplace-context';
import { ProductType } from '../product-list/types';
import './discover.scss';

export default function Discover(): JSX.Element | null {
	const [ productGroups, setProductGroups ] = useState<
		Array< ProductGroup >
	>( [] );
	const marketplaceContextValue = useContext( MarketplaceContext );
	const { isLoading, setIsLoading } = marketplaceContextValue;

	// Get the content for this screen
	useEffect( () => {
		setIsLoading( true );

		fetchDiscoverPageData()
			.then(
				( response: Array< ProductGroup > | { success: boolean } ) => {
					if ( ! Array.isArray( response ) ) {
						return [];
					}
					return response as Array< ProductGroup >;
				}
			)
			.then( ( products: Array< ProductGroup > ) => {
				setProductGroups( products );
			} )
			.finally( () => {
				setIsLoading( false );
			} );
	}, [] );

	if ( isLoading ) {
		return (
			<div className="woocommerce-marketplace__discover">
				<ProductLoader placeholderCount={ 9 } type={ ProductType.extension } />
			</div>
		);
	}

	const groupsList = productGroups.flatMap( ( group ) => group );
	return (
		<div className="woocommerce-marketplace__discover">
			{ groupsList.map( ( groups ) => (
				<ProductList
					key={ groups.id }
					title={ groups.title }
					products={ groups.items }
					groupURL={ groups.url }
					type={ groups.itemType }
				/>
			) ) }
		</div>
	);
}
