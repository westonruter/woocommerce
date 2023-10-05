/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { Table, TablePlaceholder } from '@woocommerce/components';
import {
	TableHeader,
	TableRow,
} from '@woocommerce/components/build-types/table/types';

export default function SubscriptionsTable( props: {
	rows?: TableRow[][];
	headers: TableHeader[];
	isLoading: boolean;
} ) {
	if ( props.isLoading ) {
		return (
			<TablePlaceholder
				caption={ __( 'Loading your subscriptions', 'woocommerce' ) }
				headers={ props.headers }
			/>
		);
	}

	return (
		<Table
			className="woocommerce-marketplace__my-subscriptions__table"
			headers={ props.headers }
			rows={ props.rows }
		/>
	);
}
