// Reference: https://github.com/WordPress/gutenberg/blob/f9e405e0e53d61cd36af4f3b34f2de75874de1e1/packages/edit-site/src/components/global-styles/screen-colors.js#L23
/**
 * External dependencies
 */
import { privateApis as blockEditorPrivateApis } from '@wordpress/block-editor';
import { unlock } from '@wordpress/edit-site/build-module/lock-unlock';
import { useContext } from '@wordpress/element';
import { mergeBaseAndUserConfigs } from '@wordpress/edit-site/build-module/components/global-styles/global-styles-provider';

const {
	useGlobalStyle,
	useGlobalSetting,
	useSettingsForBlockElement,
	ColorPanel: StylesColorPanel,
	GlobalStylesContext,
} = unlock( blockEditorPrivateApis );

export const ColorPanel = () => {
	const { setUserConfig } = useContext( GlobalStylesContext );
	const [ style ] = useGlobalStyle( '', undefined, 'user', {
		shouldDecodeEncode: false,
	} );
	const [ inheritedStyle, setStyle ] = useGlobalStyle( '', undefined, 'all', {
		shouldDecodeEncode: false,
	} );
	const [ rawSettings ] = useGlobalSetting( '' );
	const settings = useSettingsForBlockElement( rawSettings );

	const onChange = ( ...props ) => {
		setStyle( ...props );
		setUserConfig( ( currentConfig ) => ( {
			...currentConfig,
			settings: mergeBaseAndUserConfigs( currentConfig.settings, {
				color: {
					palette: {
						hasCreatedOwnColors: true,
					},
				},
			} ),
		} ) );
	};

	return (
		<StylesColorPanel
			inheritedValue={ inheritedStyle }
			value={ style }
			onChange={ onChange }
			settings={ settings }
		/>
	);
};
