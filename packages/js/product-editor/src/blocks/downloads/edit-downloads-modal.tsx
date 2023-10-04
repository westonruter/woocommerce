/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { createElement } from '@wordpress/element';
import { trash } from '@wordpress/icons';
import { useDispatch } from '@wordpress/data';
import {
	Button,
	Modal,
	BaseControl,
	// @ts-expect-error `__experimentalInputControl` does exist.
	__experimentalInputControl as InputControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import { DownloadableFileItem } from './types';
import { UnionIcon } from './union-icon';

type EditDownloadsModalProps = {
	downloableItem: DownloadableFileItem;
	onCancel: () => void;
	onRemove: () => void;
	onSave: () => void;
};

export const EditDownloadsModal: React.FC< EditDownloadsModalProps > = ( {
	downloableItem,
	onCancel,
	onRemove,
	onSave,
} ) => {
	const { createNotice } = useDispatch( 'core/notices' );
	const { download } = downloableItem;

	const onCopySuccess = () => {
		createNotice(
			'success',
			__( 'URL copied successfully.', 'woocommerce' )
		);
	};

	async function copyTextToClipboard( text: string ) {
		if ( 'clipboard' in navigator ) {
			await navigator.clipboard.writeText( text );
		} else {
			const textArea = document.createElement( 'textarea' );
			textArea.value = text;
			document.body.appendChild( textArea );
			textArea.select();
			document.execCommand( 'copy' );
			document.body.removeChild( textArea );
			await onCopySuccess();
		}
	}

	const handleCopyToClipboard = async () => {
		await copyTextToClipboard( download.file );
	};
	return (
		<Modal
			title={ sprintf(
				/* translators: %s is the attribute name */
				__( 'Edit %s', 'woocommerce' ),
				download.name
			) }
			onRequestClose={ (
				event:
					| React.KeyboardEvent< Element >
					| React.MouseEvent< Element >
					| React.FocusEvent< Element >
			) => {
				if ( ! event.isPropagationStopped() ) {
					onCancel();
				}
			} }
			className="woocommerce-edit-downloads-modal"
		>
			<BaseControl
				id={ 'file-name-help' }
				className="woocommerce-edit-downloads-modal__file-name"
				help={ __(
					'Your customers will see this on the thank-you page and in their order confirmation email.',
					'woocommerce'
				) }
			>
				<InputControl
					id={ 'file-name' }
					label={ __( 'FILE NAME', 'woocommerce' ) }
					name={ 'file-name' }
					value={ download.name || '' }
				/>
			</BaseControl>

			<div className="woocommerce-edit-downloads-modal__file-url">
				<InputControl
					disabled
					id={ 'file-url' }
					label={ __( 'FILE URL', 'woocommerce' ) }
					name={ 'file-url' }
					value={ download.file || '' }
					suffix={
						<Button
							icon={ <UnionIcon /> }
							onClick={ handleCopyToClipboard }
						/>
					}
				/>
			</div>
			<div className="woocommerce-edit-downloads-modal__buttons">
				<div className="woocommerce-edit-downloads-modal__buttons-left">
					<Button
						icon={ trash }
						isDestructive
						variant="tertiary"
						label={ __( 'Delete', 'woocommerce' ) }
						onClick={ onRemove }
					>
						{ __( 'Delete file', 'woocommerce' ) }
					</Button>
				</div>
				<div className="woocommerce-edit-downloads-modal__buttons-right">
					<Button
						label={ __( 'Cancel', 'woocommerce' ) }
						onClick={ onCancel }
						variant="tertiary"
					>
						{ __( 'Cancel', 'woocommerce' ) }
					</Button>
					<Button
						label={ __( 'Update', 'woocommerce' ) }
						onClick={ onSave }
						variant="primary"
					>
						{ __( 'Update', 'woocommerce' ) }
					</Button>
				</div>
			</div>
		</Modal>
	);
};
