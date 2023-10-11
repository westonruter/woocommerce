const { UPDATE_WC, USER_KEY, USER_SECRET, GITHUB_TOKEN } = process.env;
const { test: setup, expect } = require( '@playwright/test' );
const path = require( 'path' );
const fs = require( 'fs' );

const zipPath = path.resolve( 'tmp', 'woocommerce.zip' );

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<string>}
 */
const getDownloadURL = async ( request ) => {
	/**
	 * @returns {Promise<{tag_name: string, name: string, assets: {name: string, id: number}[]}[]>}
	 */
	const getReleases = async () => {
		const url =
			'https://api.github.com/repos/woocommerce/woocommerce/releases';
		const options = {
			params: {
				per_page: 100,
			},
			headers: {
				Authorization: `Bearer ${ GITHUB_TOKEN }`,
			},
		};
		const response = await request.get( url, options );
		return await response.json();
	};

	const list = await getReleases();
	const release = list.find( ( { tag_name, name } ) =>
		[ tag_name, name ].includes( UPDATE_WC )
	);
	const assetId = release.assets.find(
		( { name } ) => name === 'woocommerce.zip'
	).id;
	const downloadURL = `https://api.github.com/repos/woocommerce/woocommerce/releases/assets/${ assetId }`;

	return Promise.resolve( downloadURL );
};

setup( `Setup remote test site`, async ( { page, request } ) => {
	setup.setTimeout( 5 * 60 * 1000 );

	await setup.step( `Download WooCommerce build zip`, async () => {
		const downloadURL = await getDownloadURL( request );
		const response = await request.get( downloadURL, {
			headers: {
				Authorization: `Bearer ${ GITHUB_TOKEN }`,
				Accept: 'application/octet-stream',
			},
		} );
		expect( response.ok() ).toBeTruthy();
		const body = await response.body();
		fs.mkdirSync( 'tmp', { recursive: true } );
		fs.writeFileSync( zipPath, body );
	} );

	await setup.step( 'Login to wp-admin', async () => {
		const Username = 'Username or Email Address';
		const Password = 'Password';
		const Log_In = 'Log In';
		const Dashboard = 'Dashboard';

		// Need to wait until network idle. Otherwise, Password field gets auto-cleared after typing password in.
		await page.goto( '/wp-admin', { waitUntil: 'networkidle' } );
		await page.getByLabel( Username ).fill( USER_KEY );
		await page.getByLabel( Password, { exact: true } ).fill( USER_SECRET );
		await page.getByRole( 'button', { name: Log_In } ).click();
		await expect(
			page
				.locator( '#menu-dashboard' )
				.getByRole( 'link', { name: Dashboard } )
		).toBeVisible();
	} );

	await setup.step(
		`Deactivate currently installed WooCommerce version`,
		async () => {
			const response = await request.put(
				'/wp-json/wp/v2/plugins/woocommerce/woocommerce',
				{
					data: {
						status: 'inactive',
					},
				}
			);
			expect( response.ok() ).toBeTruthy();
		}
	);

	await setup.step(
		`Delete currently installed WooCommerce version`,
		async () => {
			const response = await request.delete(
				'/wp-json/wp/v2/plugins/woocommerce/woocommerce'
			);
			expect( response.ok() ).toBeTruthy();
		}
	);

	await setup.step( `Install WooCommerce ${ UPDATE_WC }`, async () => {
		const Upload_Plugin = 'Upload Plugin';
		const Plugin_zip_file = 'Plugin zip file';
		const Install_Now = 'Install Now';
		const Activate_Plugin = 'Activate Plugin';

		await page.goto( '/wp-admin/plugin-install.php' );
		await page.getByRole( 'button', { name: Upload_Plugin } ).click();
		await page.getByLabel( Plugin_zip_file ).setInputFiles( zipPath );
		await page.getByRole( 'button', { name: Install_Now } ).click();
		await expect(
			page.getByRole( 'link', { name: Activate_Plugin } )
		).toBeVisible( { timeout: 3 * 60 * 1000 } );
	} );

	await setup.step( `Activate WooCommerce`, async () => {
		const response = await request.put(
			'/wp-json/wp/v2/plugins/woocommerce/woocommerce',
			{
				data: {
					status: 'active',
				},
			}
		);
		expect( response.ok() ).toBeTruthy();
	} );

	await setup.step( `Verify WooCommerce version was installed`, async () => {
		const response = await request.get(
			'/wp-json/wp/v2/plugins/woocommerce/woocommerce'
		);
		const { status, version } = await response.json();
		expect( status ).toEqual( 'active' );
		expect( version ).toEqual( UPDATE_WC );
	} );

	await setup.step( `Verify WooCommerce database version`, async () => {
		const response = await request.get( '/wp-json/wc/v3/system_status' );
		const { database } = await response.json();
		const { wc_database_version } = database;
		const [ major, minor ] = UPDATE_WC.split( '.' );
		const pattern = new RegExp( `^${ major }\.${ minor }` );
		expect( wc_database_version ).toMatch( pattern );
	} );

	await setup.step( `Delete zip`, async () => {
		fs.unlinkSync( zipPath );
	} );
} );
