/*
 * wireguard-indicator@atareao.es
 *
 * Copyright (c) 2020 Lorenzo Carbonell Cerezo <a.k.a. atareao>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

imports.gi.versions.Gtk = "3.0";
imports.gi.versions.Gdk = "3.0";
imports.gi.versions.Gio = "2.0";
imports.gi.versions.Clutter = "1.0";
imports.gi.versions.St = "1.0";
imports.gi.versions.GObject = "3.0";
imports.gi.versions.GLib = "2.0";

const {Gtk, Gdk, Gio, Clutter, St, GObject, GLib} = imports.gi;

const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;

var button;

function notify(msg, details, icon='tasker') {
    let source = new MessageTray.Source(Extension.uuid, icon);
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    notification.setTransient(true);
    source.notify(notification);
}

var WireGuardIndicator = GObject.registerClass(
    class WireGuardIndicator extends PanelMenu.Button{
        _init(){
            super._init(St.Align.START);
            this._settings = Convenience.getSettings();

            /* Icon indicator */
            let theme = Gtk.IconTheme.get_default();
            if (theme == null) {
                // Workaround due to lazy initialization on wayland
                // as proposed by @fmuellner in GNOME mutter issue #960
                theme = new Gtk.IconTheme();
                theme.set_custom_theme(St.Settings.get().gtk_icon_theme);
            }
            theme.append_search_path(
                Extension.dir.get_child('icons').get_path());

            let box = new St.BoxLayout();
            let label = new St.Label({text: 'Button',
                                      y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
            //box.add(label);
            this.icon = new St.Icon({style_class: 'system-status-icon'});
            box.add(this.icon);
            this.add_child(box);
            /* Start Menu */
            this.wireGuardSwitch = new PopupMenu.PopupSwitchMenuItem(
                _('Wireguard status'),
                {active: true});
            //this.menu.addMenuItem(this.wireGuardSwitch);
            this.services_section = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this.services_section);
            /* Separator */
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            /* Setings */
            this.settingsMenuItem = new PopupMenu.PopupMenuItem(_("Settings"));
            this.settingsMenuItem.connect('activate', () => {
                ExtensionUtils.openPrefs();
            });
            this.menu.addMenuItem(this.settingsMenuItem);
            /* Help */
            this.menu.addMenuItem(this._get_help());
            /* Init */
            this._sourceId = 0;
            this._settingsChanged();
            this._settings.connect('changed',
                                   this._settingsChanged.bind(this));
        }
        _loadConfiguration(){
            this._services = this._getValue('services');
            this._checktime = this._getValue('checktime');
            this._darkthem = this._getValue('darktheme')
            this._servicesSwitches = [];
            this.services_section.actor.hide();
            if(this.services_section.numMenuItems > 0){
                this.services_section.removeAll();
            }
            this._services.forEach((item, index, array)=>{
                let [name, service] = item.split('|');
                let serviceSwitch = new PopupMenu.PopupSwitchMenuItem(
                    name,
                    {active: false});
                serviceSwitch.label.set_name(service);
                serviceSwitch.connect('toggled', this._toggleSwitch.bind(this)); 
                this._servicesSwitches.push(serviceSwitch);
                this.services_section.addMenuItem(serviceSwitch);
                this.services_section.actor.show();
            });
        }
        _toggleSwitch(widget, value){
            try {
                log("=====================");
                let service = widget.label.get_name();
                log(service);
                let setstatus = ((value == true) ? 'start': 'stop');
                let command = ['systemctl', setstatus, service];
                let proc = Gio.Subprocess.new(
                    command,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try{
                        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        this._update();
                    }catch(e){
                        logError(e);
                    }
                });
            } catch (e) {
                logError(e);
            }
        }

        _getValue(keyName){
            return this._settings.get_value(keyName).deep_unpack();
        }

        _update(){
            this._set_icon_indicator(true);
            this._servicesSwitches.forEach((serviceSwitch, index, array)=>{
                let service = serviceSwitch.label.name;
                try{
                    let command = ['systemctl', 'status', service];
                    let proc = Gio.Subprocess.new(
                        command,
                        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                    );
                    proc.communicate_utf8_async(null, null, (proc, res) => {
                        try {
                            let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                            let active = (stdout.indexOf('Active: active') > -1);
                            if(!active){
                                this._set_icon_indicator(false);
                            }
                            GObject.signal_handlers_block_by_func(serviceSwitch,
                                                          this._toggleSwitch);
                            serviceSwitch.setToggleState(active);
                            GObject.signal_handlers_unblock_by_func(serviceSwitch,
                                                            this._toggleSwitch);
                        } catch (e) {
                            logError(e);
                        }
                    });
                } catch (e) {
                    logError(e);
                }
            });
        }

        _set_icon_indicator(active){
            let darktheme = this._getValue('darktheme');
            let theme_string = (darktheme?'dark': 'light');
            let status_string = (active?'active':'paused')
            let icon_string = 'wireguard-' + status_string + '-' + theme_string;
            this.icon.set_gicon(this._get_icon(icon_string));
        }

        _get_icon(icon_name){
            let base_icon = Extension.path + '/icons/' + icon_name;
            let file_icon = Gio.File.new_for_path(base_icon + '.png')
            if(file_icon.query_exists(null) == false){
                file_icon = Gio.File.new_for_path(base_icon + '.svg')
            }
            if(file_icon.query_exists(null) == false){
                return null;
            }
            let icon = Gio.icon_new_for_string(file_icon.get_path());
            return icon;
        }

        _create_help_menu_item(text, icon_name, url){
            let icon = this._get_icon(icon_name);
            let menu_item = new PopupMenu.PopupImageMenuItem(text, icon);
            menu_item.connect('activate', () => {
                Gio.app_info_launch_default_for_uri(url, null);
            });
            return menu_item;
        }
        _createActionButton(iconName, accessibleName){
            let icon = new St.Button({ reactive:true,
                                       can_focus: true,
                                       track_hover: true,
                                       accessible_name: accessibleName,
                                       style_class: 'system-menu-action'});
            icon.child = new St.Icon({icon_name: iconName });
            return icon;
        }

        _get_help(){
            let menu_help = new PopupMenu.PopupSubMenuMenuItem(_('Help'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Project Page'), 'info', 'https://github.com/atareao/wireguard-indicator'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Get help online...'), 'help', 'https://www.atareao.es/podcast/wireguard-en-el-escritorio/'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Report a bug...'), 'bug', 'https://github.com/atareao/wireguard-indicator/issues'));

            menu_help.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('El atareao'), 'atareao', 'https://www.atareao.es'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('GitHub'), 'github', 'https://github.com/atareao'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Twitter'), 'twitter', 'https://twitter.com/atareao'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Telegram'), 'telegram', 'https://t.me/canal_atareao'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Mastodon'), 'mastodon', 'https://mastodon.social/@atareao'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('Spotify'), 'spotify', 'https://open.spotify.com/show/2v0fC8PyeeUTQDD67I0mKW'));
            menu_help.menu.addMenuItem(this._create_help_menu_item(
                _('YouTube'), 'youtube', 'http://youtube.com/c/atareao'));
            return menu_help;
        }

        _settingsChanged(){
            log("settingsChanged");
            this._loadConfiguration();
            this._update();
            if(this._sourceId > 0){
                GLib.source_remove(this._sourceId);
            }
            this._sourceId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT, this._checktime,
                this._update.bind(this));
            log(this._sourceId);
        }

        disableUpdate(){
            if(this._sourceId > 0){
                GLib.source_remove(this._sourceId);
            }
        }
    }
);

let wireGuardIndicator;

function init(){
    Convenience.initTranslations();
}

function enable(){
    wireGuardIndicator = new WireGuardIndicator();
    Main.panel.addToStatusArea('wireGuardIndicator', wireGuardIndicator, 0, 'right');
}

function disable() {
    wireGuardIndicator.disableUpdate();
    wireGuardIndicator.destroy();
}
