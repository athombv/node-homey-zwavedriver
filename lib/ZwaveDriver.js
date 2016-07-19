"use strict";

const events = require('events');

const nodeEvents = [ 'online', 'applicationUpdate' ];

class ZwaveDriver extends events.EventEmitter {
	constructor( driver_id, options ) {
		super();

		this.driver = findWhere( Homey.manifest.drivers, { id: driver_id } );

		this.options = Object.assign({
			debug			: false,
			capabilities	: {}
		}, options);

		this.nodes = {};

		this.init 			= this.init.bind(this);
		this.added 			= this.added.bind(this);
		this.deleted 		= this.deleted.bind(this);
		this.settings		= this.settings.bind(this);
		this.capabilities	= {};

		this.driver.capabilities.forEach((capability_id) => {
			let options_capability 	= this.options.capabilities[ capability_id ];

			if( typeof options_capability === 'undefined' )
				throw new Error("missing_options_capability:" + capability_id);

			this.capabilities[ capability_id ] = {};

			if( options_capability.command_get ) {
				this.capabilities[ capability_id ].get = ( device_data, callback ) => {
					var node = this.getNode( device_data );
					if( node instanceof Error ) return callback( node );

					var value = node.state[capability_id];
					if( value instanceof Error ) return callback( value );

					if( typeof value === 'undefined' ) value = null;
					return callback( null, value );
				}
			}

			if( options_capability.command_set ) {
				this.capabilities[ capability_id ].set = ( device_data, value, callback ) => {
					var node = this.getNode( device_data );
					if( node instanceof Error ) return callback( node );

					var args = options_capability.command_set_parser( value );

					node.instance.CommandClass[ options_capability.command_class ][ options_capability.command_set ]( args, ( err, result ) => {
						if( err ) return callback( err );
						node.state[capability_id] = value;
						return callback( null, node.state[capability_id] );
					})

				}
			}


		});

	}

	_debug(){
		if( this.options.debug ) {
			var args = Array.prototype.slice.call(arguments);
				args.unshift('[debug]');
			console.log.apply( null, args );
		}
	}

	init( devices_data, callback ) {

		if( devices_data.length < 1 ) return callback( null, true )

		var done = 0;
		devices_data.forEach((device_data) => {
			this.initNode( device_data, () => {
				if( ++done === devices_data.length ) return callback( null, true );
			});
		})

	}

	deleted( device_data, callback ) {
		callback = callback || function(){}

		this.deleteNode( device_data );
		callback( null, true );
	}

	added( device_data, callback ) {
		callback = callback || function(){}

		this.initNode( device_data );
		callback( null, true );
	}

	settings( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {

		var node = this.getNode( device_data );
		if( node instanceof Error ) return callback( node );

		changedKeysArr.forEach((changedKey) => {
			let settingsObj = this.options.settings[ changedKey ];

			if( typeof settingsObj === 'undefined' )
				throw new Error("missing_settings_key:" + changedKey);

			node.instance.CommandClass['COMMAND_CLASS_CONFIGURATION'].CONFIGURATION_SET({
				"Parameter Number": settingsObj.index,
				"Level": {
					"Size": settingsObj.size,
					"Default": false
				},
				'Configuration Value': settingsObj.parser( newSettingsObj[ changedKey ] )
			})

		});

		if( node.instance.battery === true && node.instance.online === false ) {
			callback( null, {
				"en": "Settings will be saved during the next wakeup of this battery device."
			});
		} else {
			callback( null, true );
		}
	}

	initNode( device_data, callback ) {
		callback = callback || function(){}

		if( !(device_data && device_data.token) )
			return new Error("invalid_device_data");

		Homey.wireless('zwave').getNode( device_data, ( err, node ) => {
			if( err ) return callback( err );

			this.nodes[ device_data.token ] = {
				instance	: node,
				device_data	: device_data,
				state		: {}
			};

			nodeEvents.forEach((nodeEvent) => {
				node.on(nodeEvent, function( args ){
					var args = Array.prototype.slice.call(arguments);
						args.unshift( device_data );
						args.unshift( nodeEvent );
					this.emit.apply( this, args );
				}.bind(this))
			});

			// register eventListeners if debug
			if( this.options.debug === true ) {

				this._debug('------------------------------------------');

				// log the entire Node
				this._debug('Node:', node.token);
				this._debug('- Battery:', node.battery);

				for( let commandClassId in node.CommandClass ) {
					this._debug('- CommandClass:', commandClassId);
					this._debug('-- Version:', node.CommandClass[commandClassId].version);
					this._debug('-- Commands:');

					for( let key in node.CommandClass[ commandClassId ] ) {
						if( typeof node.CommandClass[ commandClassId ][key] === 'function' && key === key.toUpperCase() ) {
							this._debug('---', key);
						}
					}
				}

				if( node.MultiChannelNodes ) {
					for( let multiChannelNodeId in node.MultiChannelNodes ) {
						this._debug('- MultiChannelNode:', multiChannelNodeId);

						for( let commandClassId in node.MultiChannelNodes[ multiChannelNodeId ].CommandClass ) {
							this._debug('-- CommandClass:', commandClassId);
							this._debug('--- Version:', node.CommandClass[commandClassId].version);
							this._debug('--- Commands:');

							for( let key in node.MultiChannelNodes[ multiChannelNodeId ].CommandClass[ commandClassId ] ) {
								if( typeof node.MultiChannelNodes[ multiChannelNodeId ].CommandClass[ commandClassId ][key] === 'function' && key === key.toUpperCase() ) {
									this._debug('----', key);
								}
							}
						}
					}
				}

				this._debug('------------------------------------------');
				console.log('');

				// attach event listeners
				nodeEvents.forEach((nodeEvent) => {
					node.on( nodeEvent, function() {
						this._debug(`node.on('${nodeEvent}')`, 'arguments:', arguments);
					}.bind(this))
				});

				for( let commandClassId in node.CommandClass ) {
					node.CommandClass[ commandClassId ].on('report', function() {
						this._debug(`node.CommandClass['${commandClassId}'].on('report')`, 'arguments:', arguments);
					}.bind(this))
				}

				if( node.MultiChannelNodes ) {
					for( let multiChannelNodeId in node.MultiChannelNodes ) {
						for( let commandClassId in node.MultiChannelNodes[ multiChannelNodeId ].CommandClass ) {
							node.MultiChannelNodes[ multiChannelNodeId ].CommandClass[ commandClassId ].on('report', function(){
								this._debug(`node.MultiChannelNodes['${multiChannelNodeId}'].CommandClass['${commandClassId}'].on('report')`, 'arguments:', arguments);
							}.bind(this));
						}
					}
				}

			}

			// register capabilities
			this.driver.capabilities.forEach((capability_id) => {
				let options_capability 	= this.options.capabilities[ capability_id ];

				if( typeof options_capability === 'undefined' )
					throw new Error("missing_options_capability:" + capability_id);

				var node = this.nodes[ device_data.token ].instance;

				if( typeof options_capability.multiChannelNodeId === 'number' ) {
					var node = this.nodes[ device_data.token ].instance.MultiChannelNodes[ options_capability.multiChannelNodeId ];
					if( typeof node === 'undefined' )
						throw new Error("invalid_multiChannelNodeId");

					if( typeof node.CommandClass[ options_capability.command_class ] === 'undefined' )
						throw new Error('invalid_commandClass_for_multiChannelNodeId_' + options_capability.multiChannelNodeId);
				}

				// subscribe for reports
				node.CommandClass[ options_capability.command_class ].on('report', ( command, report ) => {
					if( command.name === options_capability.command_report ) {
						var value = options_capability.command_report_parser( report );
						if( value === null ) return;

						this.nodes[ device_data.token ].state[ capability_id ] = value;

						if( value instanceof Error ) return value;

						this.realtime( device_data, capability_id, value );
					}
				})

				// get initial state
				if( options_capability.command_get ) {

					var args = {};
					if( options_capability.command_get_parser ) args = options_capability.command_get_parser();

					if( !node.CommandClass[ options_capability.command_class ] ) return console.error("invalid_commandClass_" + options_capability.command_class);
					if( !node.CommandClass[ options_capability.command_class ][ options_capability.command_get ] ) return console.error("invalid_commandClass_" + options_capability.command_class + "_command_" + options_capability.command_get );

					this._debug(`${options_capability.command_class}->${options_capability.command_get}`, 'args:', args );
					node.CommandClass[ options_capability.command_class ][ options_capability.command_get ](args, ( err, result ) => {
						this._debug( options_capability.command_class, options_capability.command_get, 'args:', args, 'err:', err, 'result:', result );
						if( err ) return this.setUnavailable( device_data, err.message || err.toString() );

						var value = options_capability.command_report_parser( result );
						if( value instanceof Error ) return value;
						if( value === null ) return;

						this.nodes[ device_data.token ].state[ capability_id ] = value;
						this.realtime( device_data, capability_id, value );
					})
				}

			});

			// register event listeners
			node.on('online', () => {
				this.setAvailable( device_data );
			})

			this.emit('initNode', device_data.token );

			return callback( null, node );
		});

	}

	deleteNode( device_data ) {

		if( !(device_data && device_data.token) )
			return new Error("invalid_device_data");

		var node = this.getNode( device_data );
		if( node instanceof Error ) return node;

		// unregister report functions
		for( let commandClassId in this.nodes[ device_data.token ].instance.CommandClass ) {
			this.nodes[ device_data.token ].instance.CommandClass[ commandClassId ].removeAllListeners('report');
		}

		if( this.nodes[ device_data.token ].instance.MultiChannelNodes && Object.keys(this.nodes[ device_data.token ].instance.MultiChannelNodes).length > 0 ) {
			for( let multiChannelNodeId in this.nodes[ device_data.token ].instance.MultiChannelNodes ) {
				for( let commandClassId in this.nodes[ device_data.token ].instance.MultiChannelNodes[ multiChannelNodeId ].CommandClass ) {
					this.nodes[ device_data.token ].instance.MultiChannelNodes[ multiChannelNodeId ].CommandClass[ commandClassId ].removeAllListeners('report');
				}
			}
		}

		this.emit('deleteNode', device_data.token );

		delete this.nodes[ device_data.token ];
	}

	getNode( device_data ) {

		if( !(device_data && device_data.token) )
			return new Error("invalid_device_data");

		return this.nodes[ device_data.token ] || new Error("invalid_node");

	}


}

module.exports = ZwaveDriver;

/*
	Helper methods
*/
function findWhere(array, criteria) {
	return array.find(item => Object.keys(criteria).every(key => item[key] === criteria[key]))
}