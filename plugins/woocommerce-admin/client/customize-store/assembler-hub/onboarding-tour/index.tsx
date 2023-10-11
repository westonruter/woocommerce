/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { TourKit, TourKitTypes } from '@woocommerce/components';
import { recordEvent } from '@woocommerce/tracks';
export * from './use-onboarding-tour';

type OnboardingTourProps = {
	onClose: () => void;
	showWelcomeTour: boolean;
	setShowWelcomeTour: ( show: boolean ) => void;
};

export const OnboardingTour = ( {
	onClose,
	setShowWelcomeTour,
	showWelcomeTour,
}: OnboardingTourProps ) => {
	const [ placement, setPlacement ] =
		useState< TourKitTypes.WooConfig[ 'placement' ] >( 'left' );

	if ( showWelcomeTour ) {
		return (
			<TourKit
				config={ {
					options: {
						effects: {
							arrowIndicator: false,
							overlay: false,
							liveResize: {
								rootElementSelector: '#adminmenuback',
								resize: true,
							},
						},
						portalParentElement:
							document.getElementById( 'wpbody' ),
						popperModifiers: [
							{
								name: 'bottom-left',
								enabled: true,
								phase: 'beforeWrite',
								requires: [ 'computeStyles' ],
								fn: ( { state } ) => {
									state.styles.popper.top = 'auto';
									state.styles.popper.left = 'auto';
									state.styles.popper.bottom = '16px';
									state.styles.popper.transform =
										'translate3d(16px, 0px, 0px)';
								},
							},
						],
						classNames: [
							'woocommerce-customize-store-tour-kit',
							'woocommerce-customize-store-welcome-tourkit',
						],
					},
					steps: [
						{
							meta: {
								name: 'welcome-tour',
								primaryButton: {
									text: __( 'Take a tour', 'woocommerce' ),
								},
								descriptions: {
									desktop: __(
										"This is where you can start customizing the look and feel of your store, including adding your logo, and changing colors and layouts. Take a quick tour to discover what's possible.",
										'woocommerce'
									),
								},
								heading: __(
									'Welcome to your AI-generated store!',
									'woocommerce'
								),
								skipButton: {
									isVisible: true,
								},
							},
							referenceElements: {
								desktop: '#adminmenuback',
							},
						},
					],
					closeHandler: ( _steps, _currentStepIndex, source ) => {
						if ( source === 'done-btn' ) {
							// Click on "Take a tour" button
							recordEvent(
								'customize_your_store_assembler_hub_tour_start'
							);
							setShowWelcomeTour( false );
						} else {
							recordEvent(
								'customize_your_store_assembler_hub_tour_skip'
							);
							onClose();
						}
					},
				} }
			/>
		);
	}

	return (
		<TourKit
			config={ {
				placement,
				options: {
					effects: {
						spotlight: {
							interactivity: {
								enabled: true,
								rootElementSelector: '#wpwrap',
							},
						},
						arrowIndicator: true,
						autoScroll: {
							behavior: 'auto',
							block: 'center',
						},
						liveResize: {
							mutation: true,
							resize: true,
							rootElementSelector: '#wpwrap',
						},
					},
					callbacks: {
						onPreviousStep: () => {
							setPlacement( 'left' );
						},
						onNextStep: () => {
							setPlacement( 'right-start' );
						},
					},
					popperModifiers: [
						{
							name: 'right-start',
							enabled: true,
							phase: 'beforeWrite',
							requires: [ 'computeStyles' ],
							fn: ( { state } ) => {
								state.styles.arrow.transform =
									'translate3d(0px, 114.4px, 0)';
							},
						},
						{
							name: 'offset',
							options: {
								offset: ( {
									// eslint-disable-next-line @typescript-eslint/no-shadow
									placement,
								}: {
									placement: TourKitTypes.WooConfig[ 'placement' ];
									[ key: string ]: unknown;
								} ) => {
									if ( placement === 'left' ) {
										return [ -15, 35 ];
									}
									return [ 52, 16 ];
								},
							},
						},
					],
					classNames: 'woocommerce-customize-store-tour-kit',
				},
				steps: [
					{
						referenceElements: {
							desktop: `.edit-site-layout__canvas-container`,
						},
						meta: {
							name: 'view-changes-real-time',
							heading: __(
								'View your changes in real time',
								'woocommerce'
							),
							descriptions: {
								desktop: __(
									'Any changes you make to the layout and style will appear here in real time — perfect for testing different looks before you make it live. You can also resize this area to check how your store looks on mobile.',
									'woocommerce'
								),
							},
						},
					},
					{
						referenceElements: {
							desktop: `.edit-site-layout__sidebar-region`,
						},
						meta: {
							name: 'make-your-store-your-own',
							heading: __(
								'Make your store your own',
								'woocommerce'
							),
							descriptions: {
								desktop: __(
									"Customize the style and layout of your store to fit your brand! Add your logo, change the font and colors, and try out different page layouts. You'll be able to edit the text and images later via the Editor.",
									'woocommerce'
								),
							},
							secondaryButton: {
								text: __( 'Previous', 'woocommerce' ),
							},
						},
					},
				],
				closeHandler: ( _steps, _currentStepIndex, source ) => {
					if ( source === 'done-btn' ) {
						recordEvent(
							'customize_your_store_assembler_hub_tour_complete'
						);
					} else {
						recordEvent(
							'customize_your_store_assembler_hub_tour_close'
						);
					}

					onClose();
				},
			} }
		></TourKit>
	);
};
