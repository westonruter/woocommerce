const { test, expect, request } = require( '@playwright/test' );
const { features } = require( '../../utils' );
const { activateTheme } = require( '../../utils/themes' );
const { setOption } = require( '../../utils/options' );

const ASSEMBLER_HUB_URL =
	'/wp-admin/admin.php?page=wc-admin&path=%2Fcustomize-store%2Fassembler-hub';

test.describe( 'Store owner can view Assembler Hub for store customization', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		// In some environments the tour blocks clicking other elements.
		await setOption(
			request,
			baseURL,
			'woocommerce_customize_store_onboarding_tour_hidden',
			'yes'
		);

		await features.setFeatureFlag(
			request,
			baseURL,
			'customize-store',
			true
		);

		// Need a block enabled theme to test
		await activateTheme( 'twentytwentythree' );
	} );

	test.afterAll( async ( { baseURL } ) => {
		await features.resetFeatureFlags( request, baseURL );

		// Reset theme back to twentynineteen
		await activateTheme( 'twentynineteen' );

		// Reset tour to visible.
		await setOption(
			request,
			baseURL,
			'woocommerce_customize_store_onboarding_tour_hidden',
			'no'
		);
	} );

	test( 'Can view the Assembler Hub page', async ( { page } ) => {
		await page.goto( ASSEMBLER_HUB_URL );
		const locator = page.locator( 'h1:visible' );
		await expect( locator ).toHaveText( "Let's get creative" );
	} );

	test( 'Visiting change header should show a list of block patterns to choose from', async ( {
		page,
	} ) => {
		await page.goto( ASSEMBLER_HUB_URL );
		await page.click( 'text=Change your header' );

		const locator = page.locator(
			'.block-editor-block-patterns-list__list-item'
		);

		await expect( locator ).toHaveCount( 4 );
	} );
} );
