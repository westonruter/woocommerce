module.exports = ( { core } ) => {
	const { UPLOAD_RESULT, E2E_RESULT, PLUGIN_NAME, PLUGIN_SLUG } = process.env;
	const { selectEmoji } = require( './utils' );
	const fs = require( 'fs' );

	const emoji_UPLOAD = selectEmoji( UPLOAD_RESULT );
	const emoji_E2E = selectEmoji( E2E_RESULT );
	const reportURL = `https://woocommerce.github.io/woocommerce-test-reports/daily/${ PLUGIN_SLUG }/e2e`;

	const blockGroup = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `<${ reportURL }|*${ PLUGIN_NAME }*>`,
			},
		},
		{
			type: 'context',
			elements: [
				{
					type: 'mrkdwn',
					text: `"Upload plugin" test ${ emoji_UPLOAD }\tOther E2E tests ${ emoji_E2E }`,
				},
			],
		},
		{
			type: 'divider',
		},
	];
	const blockGroup_stringified = JSON.stringify( blockGroup );

	const path = `/tmp/${ PLUGIN_SLUG }.json`;
	fs.writeFileSync( path, blockGroup_stringified );

	core.setOutput( 'path', path );
};
