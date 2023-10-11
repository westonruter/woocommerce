/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	createElement,
	Fragment,
	createInterpolateElement,
	useState,
} from '@wordpress/element';

import { useInstanceId } from '@wordpress/compose';
import { cleanForSlug } from '@wordpress/url';
import { useSelect, useDispatch } from '@wordpress/data';
import { useWooBlockProps } from '@woocommerce/block-templates';
import {
	PRODUCTS_STORE_NAME,
	WCDataSelector,
	Product,
} from '@woocommerce/data';
import classNames from 'classnames';
import {
	Button,
	BaseControl,
	// @ts-expect-error `__experimentalInputControl` does exist.
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No types for this exist yet.
// eslint-disable-next-line @woocommerce/dependency-group
import { useEntityProp, useEntityId } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { AUTO_DRAFT_NAME } from '../../../utils';
import { EditProductLinkModal } from '../../../components/edit-product-link-modal';
import { useValidation } from '../../../contexts/validation-context';
import { NameBlockAttributes } from './types';
import { useProductEdits } from '../../../hooks/use-product-edits';
import { ProductEditorBlockEditProps } from '../../../types';

export function Edit( {
	attributes,
}: ProductEditorBlockEditProps< NameBlockAttributes > ) {
	const blockProps = useWooBlockProps( attributes );

	const { editEntityRecord, saveEntityRecord } = useDispatch( 'core' );

	const { hasEdit } = useProductEdits();

	const [ showProductLinkEditModal, setShowProductLinkEditModal ] =
		useState( false );

	const productId = useEntityId( 'postType', 'product' );
	const product: Product = useSelect( ( select ) =>
		select( 'core' ).getEditedEntityRecord(
			'postType',
			'product',
			productId
		)
	);

	const [ sku, setSku ] = useEntityProp( 'postType', 'product', 'sku' );
	const [ name, setName ] = useEntityProp< string >(
		'postType',
		'product',
		'name'
	);

	const { permalinkPrefix, permalinkSuffix } = useSelect(
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		( select: WCDataSelector ) => {
			const { getPermalinkParts } = select( PRODUCTS_STORE_NAME );
			if ( productId ) {
				const parts = getPermalinkParts( productId );
				return {
					permalinkPrefix: parts?.prefix,
					permalinkSuffix: parts?.suffix,
				};
			}
			return {};
		}
	);

	const {
		ref: nameRef,
		error: nameValidationError,
		validate: validateName,
	} = useValidation< Product >(
		'name',
		async function nameValidator() {
			if ( ! name || name === AUTO_DRAFT_NAME ) {
				return __( 'This field is required.', 'woocommerce' );
			}

			if ( name.length > 120 ) {
				return __(
					'Please enter a product name shorter than 120 characters.',
					'woocommerce'
				);
			}
		},
		[ name ]
	);

	const setSkuIfEmpty = () => {
		if ( sku || nameValidationError ) {
			return;
		}
		setSku( cleanForSlug( name ) );
	};

	const help =
		nameValidationError ??
		( productId &&
			[ 'publish', 'draft' ].includes( product.status ) &&
			permalinkPrefix && (
				<span className="woocommerce-product-form__secondary-text product-details-section__product-link">
					{ __( 'Product link', 'woocommerce' ) }
					:&nbsp;
					<a
						href={ product.permalink }
						target="_blank"
						rel="noreferrer"
					>
						{ permalinkPrefix }
						{ product.slug || cleanForSlug( name ) }
						{ permalinkSuffix }
					</a>
					<Button
						variant="link"
						onClick={ () => setShowProductLinkEditModal( true ) }
					>
						{ __( 'Edit', 'woocommerce' ) }
					</Button>
				</span>
			) );

	const nameControlId = useInstanceId(
		BaseControl,
		'product_name'
	) as string;

	return (
		<>
			<div { ...blockProps }>
				<BaseControl
					id={ nameControlId }
					label={ createInterpolateElement(
						__( 'Name <required />', 'woocommerce' ),
						{
							required: (
								<span className="woocommerce-product-form__required-input">
									{ __( '*', 'woocommerce' ) }
								</span>
							),
						}
					) }
					className={ classNames( {
						'has-error': nameValidationError,
					} ) }
					help={ help }
				>
					<InputControl
						id={ nameControlId }
						ref={ nameRef }
						name="name"
						// eslint-disable-next-line jsx-a11y/no-autofocus
						autoFocus={ attributes.autoFocus }
						placeholder={ __(
							'e.g. 12 oz Coffee Mug',
							'woocommerce'
						) }
						onChange={ setName }
						value={ name && name !== AUTO_DRAFT_NAME ? name : '' }
						autoComplete="off"
						data-1p-ignore
						onBlur={ () => {
							if ( hasEdit( 'name' ) ) {
								setSkuIfEmpty();
								validateName();
							}
						} }
					/>
				</BaseControl>

				{ showProductLinkEditModal && (
					<EditProductLinkModal
						permalinkPrefix={ permalinkPrefix || '' }
						permalinkSuffix={ permalinkSuffix || '' }
						product={ product }
						onCancel={ () => setShowProductLinkEditModal( false ) }
						onSaved={ () => setShowProductLinkEditModal( false ) }
						saveHandler={ async ( updatedSlug ) => {
							const { slug, permalink }: Product =
								await saveEntityRecord( 'postType', 'product', {
									id: product.id,
									slug: updatedSlug,
								} );

							if ( slug && permalink ) {
								editEntityRecord(
									'postType',
									'product',
									product.id,
									{
										slug,
										permalink,
									}
								);

								return {
									slug,
									permalink,
								};
							}
						} }
					/>
				) }
			</div>
		</>
	);
}
