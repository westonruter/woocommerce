/* eslint-disable @woocommerce/dependency-group */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * External dependencies
 */
import { __experimentalRequestJetpackToken as requestJetpackToken } from '@woocommerce/ai';
import apiFetch from '@wordpress/api-fetch';
import { recordEvent } from '@woocommerce/tracks';
import { OPTIONS_STORE_NAME } from '@woocommerce/data';
import { Sender, assign, createMachine, actions } from 'xstate';
import { dispatch, resolveSelect } from '@wordpress/data';
// @ts-ignore No types for this exist yet.
import { store as coreStore } from '@wordpress/core-data';
// @ts-ignore No types for this exist yet.
import { mergeBaseAndUserConfigs } from '@wordpress/edit-site/build-module/components/global-styles/global-styles-provider';
/**
 * Internal dependencies
 */
import { designWithAiStateMachineContext } from './types';
import { lookAndTone } from './prompts';
import { FONT_PAIRINGS } from '../assembler-hub/sidebar/global-styles/font-pairing-variations/constants';
import { COLOR_PALETTES } from '../assembler-hub/sidebar/global-styles/color-palette-variations/constants';
import {
	patternsToNameMap,
	getTemplatePatterns,
} from '../assembler-hub/hooks/use-home-templates';
import { HOMEPAGE_TEMPLATES } from '../data/homepageTemplates';

const { escalate } = actions;

const browserPopstateHandler =
	() => ( sendBack: Sender< { type: 'EXTERNAL_URL_UPDATE' } > ) => {
		const popstateHandler = () => {
			sendBack( { type: 'EXTERNAL_URL_UPDATE' } );
		};
		window.addEventListener( 'popstate', popstateHandler );
		return () => {
			window.removeEventListener( 'popstate', popstateHandler );
		};
	};

export const getCompletion = async < ValidResponseObject >( {
	queryId,
	prompt,
	version,
	responseValidation,
	retryCount,
}: {
	queryId: string;
	prompt: string;
	version: string;
	responseValidation: ( arg0: string ) => ValidResponseObject;
	retryCount: number;
} ) => {
	const { token } = await requestJetpackToken();
	let data: {
		completion: string;
	};
	let parsedCompletionJson;
	try {
		const url = new URL(
			'https://public-api.wordpress.com/wpcom/v2/text-completion'
		);

		url.searchParams.append( 'feature', 'woo_cys' );

		data = await apiFetch( {
			url: url.toString(),
			method: 'POST',
			data: {
				token,
				prompt,
				_fields: 'completion',
			},
		} );
	} catch ( error ) {
		recordEvent( 'customize_your_store_ai_completion_api_error', {
			query_id: queryId,
			version,
			retry_count: retryCount,
			error_type: 'api_request_error',
		} );
		throw error;
	}

	try {
		parsedCompletionJson = JSON.parse( data.completion );
	} catch {
		recordEvent( 'customize_your_store_ai_completion_response_error', {
			query_id: queryId,
			version,
			retry_count: retryCount,
			error_type: 'json_parse_error',
			response: data.completion,
		} );
		throw new Error(
			`Error validating Jetpack AI text completions response for ${ queryId }`
		);
	}

	try {
		const validatedResponse = responseValidation( parsedCompletionJson );
		recordEvent( 'customize_your_store_ai_completion_success', {
			query_id: queryId,
			version,
			retry_count: retryCount,
		} );
		return validatedResponse;
	} catch ( error ) {
		recordEvent( 'customize_your_store_ai_completion_response_error', {
			query_id: queryId,
			version,
			retry_count: retryCount,
			error_type: 'valid_json_invalid_values',
			response: data.completion,
		} );
		throw error;
	}
};

export const getLookAndTone = async (
	context: designWithAiStateMachineContext
) => {
	return getCompletion( {
		...lookAndTone,
		prompt: lookAndTone.prompt(
			context.businessInfoDescription.descriptionText
		),
		retryCount: 0,
	} );
};

export const queryAiEndpoint = createMachine(
	{
		id: 'query-ai-endpoint',
		predictableActionArguments: true,
		initial: 'init',
		context: {
			// these values are all overwritten by incoming parameters
			prompt: '',
			queryId: '',
			version: '',
			responseValidation: () => true,
			retryCount: 0,
			validatedResponse: {} as unknown,
		},
		states: {
			init: {
				always: 'querying',
				entry: [ 'setRetryCount' ],
			},
			querying: {
				invoke: {
					src: 'getCompletion',
					onDone: {
						target: 'success',
						actions: [ 'handleAiResponse' ],
					},
					onError: {
						target: 'error',
					},
				},
			},
			error: {
				always: [
					{
						cond: ( context ) => context.retryCount >= 3,
						target: 'querying',
						actions: [
							// Throw an error to be caught by the parent machine.
							escalate( () => ( {
								data: 'Max retries exceeded',
							} ) ),
						],
					},
					{
						target: 'querying',
						actions: assign( {
							retryCount: ( context ) => context.retryCount + 1,
						} ),
					},
				],
			},
			success: {
				type: 'final',
				data: ( context ) => {
					return {
						result: 'success',
						response: context.validatedResponse,
					};
				},
			},
		},
	},
	{
		actions: {
			handleAiResponse: assign( {
				validatedResponse: ( _context, event: unknown ) =>
					( event as { data: unknown } ).data,
			} ),
			setRetryCount: assign( {
				retryCount: 0,
			} ),
		},
		services: {
			getCompletion,
		},
	}
);

export const updateStorePatterns = async (
	context: designWithAiStateMachineContext
) => {
	try {
		// TODO: Probably move this to a more appropriate place with a check. We should set this when the user granted permissions during the onboarding phase.
		await dispatch( OPTIONS_STORE_NAME ).updateOptions( {
			woocommerce_blocks_allow_ai_connection: true,
		} );

		const response: {
			ai_content_generated: boolean;
			additional_errors?: unknown[];
		} = await apiFetch( {
			path: '/wc/store/patterns',
			method: 'POST',
			data: {
				business_description:
					context.businessInfoDescription.descriptionText,
			},
		} );

		if ( ! response.ai_content_generated ) {
			throw new Error(
				'AI content not generated: ' + response.additional_errors
					? JSON.stringify( response.additional_errors )
					: ''
			);
		}
	} catch ( error ) {
		recordEvent( 'customize_your_store_update_store_pattern_api_error', {
			error: error instanceof Error ? error.message : 'unknown',
		} );
		throw error;
	}
};

// Update the current global styles of theme
const updateGlobalStyles = async ( {
	colorPaletteName = COLOR_PALETTES[ 0 ].title,
	fontPairingName = FONT_PAIRINGS[ 0 ].title,
}: {
	colorPaletteName: string;
	fontPairingName: string;
} ) => {
	const colorPalette = COLOR_PALETTES.find(
		( palette ) => palette.title === colorPaletteName
	);
	const fontPairing = FONT_PAIRINGS.find(
		( pairing ) => pairing.title === fontPairingName
	);

	const globalStylesId = await resolveSelect(
		coreStore
		// @ts-ignore No types for this exist yet.
	).__experimentalGetCurrentGlobalStylesId();

	// @ts-ignore No types for this exist yet.
	const { saveEntityRecord } = dispatch( coreStore );

	await saveEntityRecord(
		'root',
		'globalStyles',
		{
			id: globalStylesId,
			styles: mergeBaseAndUserConfigs(
				colorPalette?.styles || {},
				fontPairing?.styles || {}
			),
			settings: mergeBaseAndUserConfigs(
				colorPalette?.settings || {},
				fontPairing?.settings || {}
			),
		},
		{
			throwOnError: true,
		}
	);
};

// Update the current theme template
const updateTemplate = async ( {
	homepageTemplateId,
}: {
	homepageTemplateId: keyof typeof HOMEPAGE_TEMPLATES;
} ) => {
	// @ts-ignore No types for this exist yet.
	const { invalidateResolutionForStoreSelector } = dispatch( coreStore );

	// Ensure that the patterns are up to date because we populate images and content in previous step.
	invalidateResolutionForStoreSelector( 'getBlockPatterns' );

	const patterns = ( await resolveSelect(
		coreStore
		// @ts-ignore No types for this exist yet.
	).getBlockPatterns() ) as Pattern[];
	const patternsByName = patternsToNameMap( patterns );
	const homepageTemplate = getTemplatePatterns(
		HOMEPAGE_TEMPLATES[ homepageTemplateId ].blocks,
		patternsByName
	);

	const content = [ ...homepageTemplate ]
		.filter( Boolean )
		.map( ( pattern ) => pattern.content )
		.join( '\n\n' );

	const currentTemplate = await resolveSelect(
		coreStore
		// @ts-ignore No types for this exist yet.
	).__experimentalGetTemplateForLink( '/' );

	// @ts-ignore No types for this exist yet.
	const { saveEntityRecord } = dispatch( coreStore );

	await saveEntityRecord(
		'postType',
		currentTemplate.type,
		{
			id: currentTemplate.id,
			content,
		},
		{
			throwOnError: true,
		}
	);
};

export const assembleSite = async (
	context: designWithAiStateMachineContext
) => {
	try {
		await updateGlobalStyles( {
			colorPaletteName: context.aiSuggestions.defaultColorPalette.default,
			fontPairingName: context.aiSuggestions.fontPairing,
		} );
		recordEvent( 'customize_your_store_ai_update_global_styles_success' );
	} catch ( error ) {
		// TODO handle error
		// eslint-disable-next-line no-console
		console.error( error );
		recordEvent(
			'customize_your_store_ai_update_global_styles_response_error',
			{
				error: error instanceof Error ? error.message : 'unknown',
			}
		);
	}

	try {
		await updateTemplate( {
			// TODO: Get from context
			homepageTemplateId: context.aiSuggestions
				.homepageTemplate as keyof typeof HOMEPAGE_TEMPLATES,
		} );
		recordEvent( 'customize_your_store_ai_update_template_success' );
	} catch ( error ) {
		// TODO handle error
		// eslint-disable-next-line no-console
		console.error( error );
		recordEvent( 'customize_your_store_ai_update_template_response_error', {
			error: error instanceof Error ? error.message : 'unknown',
		} );
	}
};

const installAndActivateTheme = async () => {
	const themeSlug = 'twentytwentythree';

	try {
		await apiFetch( {
			path: `/wc-admin/onboarding/themes/install?theme=${ themeSlug }`,
			method: 'POST',
		} );

		await apiFetch( {
			path: `/wc-admin/onboarding/themes/activate?theme=${ themeSlug }&theme_switch_via_cys_ai_loader=1`,
			method: 'POST',
		} );
	} catch ( error ) {
		recordEvent(
			'customize_your_store_ai_install_and_activate_theme_error',
			{
				theme: themeSlug,
				error: error instanceof Error ? error.message : 'unknown',
			}
		);
		throw error;
	}
};

const saveAiResponseToOption = ( context: designWithAiStateMachineContext ) => {
	return dispatch( OPTIONS_STORE_NAME ).updateOptions( {
		woocommerce_customize_store_ai_suggestions: context.aiSuggestions,
	} );
};

export const services = {
	getLookAndTone,
	browserPopstateHandler,
	queryAiEndpoint,
	assembleSite,
	updateStorePatterns,
	saveAiResponseToOption,
	installAndActivateTheme,
};
