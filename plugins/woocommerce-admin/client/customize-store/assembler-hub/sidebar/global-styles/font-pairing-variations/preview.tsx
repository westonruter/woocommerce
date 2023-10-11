// Reference: https://github.com/Automattic/wp-calypso/blob/d3c9b16fb99ce242f61baa21119b7c20f8823be6/packages/global-styles/src/components/font-pairing-variations/preview.tsx
/* eslint-disable @woocommerce/dependency-group */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * External dependencies
 */
import {
	// @ts-ignore No types for this exist yet.
	__experimentalHStack as HStack,
	// @ts-ignore No types for this exist yet.
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useResizeObserver, useViewportMatch } from '@wordpress/compose';
import { useMemo, useState } from '@wordpress/element';
import {
	privateApis as blockEditorPrivateApis,
	// @ts-ignore no types exist yet.
} from '@wordpress/block-editor';
// @ts-ignore No types for this exist yet.
import { unlock } from '@wordpress/edit-site/build-module/lock-unlock';
import { GlobalStylesVariationIframe } from '../global-styles-variation-iframe';
import { FontFamiliesLoader, FontFamily } from './font-families-loader';
import {
	FONT_PREVIEW_LARGE_WIDTH,
	FONT_PREVIEW_LARGE_HEIGHT,
	FONT_PREVIEW_WIDTH,
	FONT_PREVIEW_HEIGHT,
} from './constants';

const { useGlobalStyle, useGlobalSetting } = unlock( blockEditorPrivateApis );

const DEFAULT_LARGE_FONT_STYLES: React.CSSProperties = {
	fontSize: '13vw', // 18px for min-width wide breakpoint and 15px for max-width wide
	lineHeight: '20px',
	color: '#000000',
};

export const FontPairingVariationPreview = () => {
	const [ fontFamilies ] = useGlobalSetting(
		'typography.fontFamilies.theme'
	) as [ FontFamily[] ];

	const [ textFontFamily = 'serif' ] = useGlobalStyle(
		'typography.fontFamily'
	);
	const [ textFontStyle = 'normal' ] = useGlobalStyle(
		'typography.fontStyle'
	);
	const [ textLetterSpacing = '-0.15px' ] = useGlobalStyle(
		'typography.letterSpacing'
	);
	const [ textFontWeight = 400 ] = useGlobalStyle( 'typography.fontWeight' );

	const [ headingFontFamily = textFontFamily ] = useGlobalStyle(
		'elements.heading.typography.fontFamily'
	);
	const [ headingFontStyle = textFontStyle ] = useGlobalStyle(
		'elements.heading.typography.fontStyle'
	);
	const [ headingFontWeight = textFontWeight ] = useGlobalStyle(
		'elements.heading.typography.fontWeight'
	);
	const [ headingLetterSpacing = textLetterSpacing ] = useGlobalStyle(
		'elements.heading.typography.letterSpacing'
	);

	const [ containerResizeListener, { width } ] = useResizeObserver();
	const isDesktop = useViewportMatch( 'large' );
	const defaultWidth = isDesktop
		? FONT_PREVIEW_LARGE_WIDTH
		: FONT_PREVIEW_WIDTH;
	const defaultHeight = isDesktop
		? FONT_PREVIEW_LARGE_HEIGHT
		: FONT_PREVIEW_HEIGHT;
	const ratio = width ? width / defaultWidth : 1;
	const normalizedHeight = Math.ceil( defaultHeight * ratio );
	const externalFontFamilies = fontFamilies.filter(
		( { slug } ) => slug !== 'system-font'
	);
	const [ isLoaded, setIsLoaded ] = useState( ! externalFontFamilies.length );

	const getFontFamilyName = ( targetFontFamily: string ) => {
		const fontFamily = fontFamilies.find(
			( { fontFamily: _fontFamily } ) => _fontFamily === targetFontFamily
		);
		return fontFamily?.name || fontFamily?.fontFamily || targetFontFamily;
	};

	const textFontFamilyName = useMemo(
		() => getFontFamilyName( textFontFamily ),
		[ textFontFamily, fontFamilies ]
	);

	const headingFontFamilyName = useMemo(
		() => getFontFamilyName( headingFontFamily ),
		[ headingFontFamily, fontFamilies ]
	);

	const handleOnLoad = () => setIsLoaded( true );

	return (
		<GlobalStylesVariationIframe
			width={ width }
			height={ normalizedHeight }
			containerResizeListener={ containerResizeListener }
		>
			<>
				<div
					style={ {
						// Apply the normalized height only when the width is available
						height: width ? normalizedHeight : 0,
						width: '100%',
						background: 'white',
						cursor: 'pointer',
					} }
				>
					<div
						style={ {
							height: '100%',
							overflow: 'hidden',
							opacity: isLoaded ? 1 : 0,
						} }
					>
						<HStack
							spacing={ 10 * ratio }
							justify="flex-start"
							style={ {
								height: '100%',
								overflow: 'hidden',
							} }
						>
							<VStack
								spacing={ 1 }
								style={ {
									margin: '10px',
									width: '100%',
									textAlign: isDesktop ? 'center' : 'left',
								} }
							>
								<div
									aria-label={ headingFontFamilyName }
									style={ {
										...DEFAULT_LARGE_FONT_STYLES,
										letterSpacing: headingLetterSpacing,
										fontWeight: headingFontWeight,
										fontFamily: headingFontFamily,
										fontStyle: headingFontStyle,
									} }
								>
									{ headingFontFamilyName }
								</div>
								<div
									aria-label={ textFontFamilyName }
									style={ {
										...DEFAULT_LARGE_FONT_STYLES,
										fontSize: '13px',
										letterSpacing: textLetterSpacing,
										fontWeight: textFontWeight,
										fontFamily: textFontFamily,
										fontStyle: textFontStyle,
									} }
								>
									{ textFontFamilyName }
								</div>
							</VStack>
						</HStack>
					</div>
				</div>
				<FontFamiliesLoader
					fontFamilies={ fontFamilies }
					onLoad={ handleOnLoad }
				/>
			</>
		</GlobalStylesVariationIframe>
	);
};
