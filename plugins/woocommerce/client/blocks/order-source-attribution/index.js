/**
 * External dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { Icon, box } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import metadata from './block.json';

registerBlockType( metadata, {
	attributes: {
		...metadata.attributes,
	}
} );

