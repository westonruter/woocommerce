/**
 * External dependencies
 */
import { Product } from '@woocommerce/data';
import { Button, Icon } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { check } from '@wordpress/icons';
import { createElement, Fragment } from '@wordpress/element';
import { MouseEvent, ReactNode } from 'react';

/**
 * Internal dependencies
 */
import { useValidations } from '../../../../contexts/validation-context';
import { WPError } from '../../../../utils/get-product-error-message';
import { SaveDraftButtonProps } from '../../save-draft-button';

export function useSaveDraft( {
	productStatus,
	productType = 'product',
	disabled,
	onClick,
	onSaveSuccess,
	onSaveError,
	...props
}: SaveDraftButtonProps & {
	onSaveSuccess?( product: Product ): void;
	onSaveError?( error: WPError ): void;
} ): Button.ButtonProps {
	const [ productId ] = useEntityProp< number >(
		'postType',
		productType,
		'id'
	);

	const { hasEdits, isDisabled } = useSelect(
		( select ) => {
			const { hasEditsForEntityRecord, isSavingEntityRecord } =
				select( 'core' );
			const isSaving = isSavingEntityRecord< boolean >(
				'postType',
				productType,
				productId
			);

			return {
				isDisabled: isSaving,
				hasEdits: hasEditsForEntityRecord< boolean >(
					'postType',
					productType,
					productId
				),
			};
		},
		[ productId ]
	);

	const { isValidating, validate } = useValidations< Product >();

	const ariaDisabled =
		disabled ||
		isDisabled ||
		( productStatus !== 'publish' && ! hasEdits ) ||
		isValidating;

	const { editEntityRecord, saveEditedEntityRecord } = useDispatch( 'core' );

	async function handleClick( event: MouseEvent< HTMLButtonElement > ) {
		if ( ariaDisabled ) {
			return event.preventDefault();
		}

		if ( onClick ) {
			onClick( event );
		}

		try {
			await validate( { status: 'draft' } );

			await editEntityRecord( 'postType', productType, productId, {
				status: 'draft',
			} );
			const publishedProduct = await saveEditedEntityRecord< Product >(
				'postType',
				productType,
				productId,
				{
					throwOnError: true,
				}
			);

			if ( onSaveSuccess ) {
				onSaveSuccess( publishedProduct );
			}
		} catch ( error ) {
			if ( onSaveError ) {
				onSaveError( error as WPError );
			}
		}
	}

	let children: ReactNode;
	if ( productStatus === 'publish' ) {
		children = __( 'Switch to draft', 'woocommerce' );
	} else if ( hasEdits || productStatus === 'auto-draft' ) {
		children = __( 'Save draft', 'woocommerce' );
	} else {
		children = (
			<>
				<Icon icon={ check } />
				{ __( 'Saved', 'woocommerce' ) }
			</>
		);
	}

	return {
		children,
		...props,
		'aria-disabled': ariaDisabled,
		variant: 'tertiary',
		onClick: handleClick,
	};
}
