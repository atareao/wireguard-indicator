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

imports.gi.versions.GLib = "2.0";
imports.gi.versions.GObject = "2.0";
imports.gi.versions.Gio = "2.0";
imports.gi.versions.Gtk = "3.0";

const {GLib, GObject, Gio, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const PreferencesWidget = Extension.imports.preferenceswidget;
const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;


function init() {
    Convenience.initTranslations();
}

var AboutWidget = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.AboutWidget').replace(/[\W_]+/g,'_')
    },
    class AboutWidget extends Gtk.Grid{
        _init(){
            super._init({
                margin_bottom: 18,
                row_spacing: 8,
                hexpand: true,
                halign: Gtk.Align.CENTER,
                orientation: Gtk.Orientation.VERTICAL
            });

            let aboutIcon = Gtk.Image.new_from_file(
                this._get_icon_file('wireguard-icon'));
            this.add(aboutIcon);

            let aboutName = new Gtk.Label({
                label: "<b>" + _("WireGuard Indicator") + "</b>",
                use_markup: true
            });
            this.add(aboutName);

            let aboutVersion = new Gtk.Label({ label: _('Version: ') + Extension.metadata.version.toString() });
            this.add(aboutVersion);

            let aboutDescription = new Gtk.Label({
                label:  Extension.metadata.description
            });
            this.add(aboutDescription);

            let aboutWebsite = new Gtk.Label({
                label: '<a href="%s">%s</a>'.format(
                    Extension.metadata.url,
                    _("Atareao")
                ),
                use_markup: true
            });
            this.add(aboutWebsite);

            let aboutCopyright = new Gtk.Label({
                label: "<small>" + _('Copyright © 2020 Lorenzo Carbonell') + "</small>",
                use_markup: true
            });
            this.add(aboutCopyright);

            let aboutLicense = new Gtk.Label({
                label: "<small>" +
                _("THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n") + 
                _("IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n") + 
                _("FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n") + 
                _("AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n") + 
                _("LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\n") + 
                _("FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS\n") + 
                _("IN THE SOFTWARE.\n") + 
                "</small>",
                use_markup: true,
                justify: Gtk.Justification.CENTER
            });
        this.add(aboutLicense);
        }
        _get_icon_file(icon_name){
            let base_icon = Extension.path + '/icons/' + icon_name;
            let file_icon = Gio.File.new_for_path(base_icon + '.png')
            if(file_icon.query_exists(null) == false){
                file_icon = Gio.File.new_for_path(base_icon + '.svg')
            }
            if(file_icon.query_exists(null) == false){
                return null;
            }
            return file_icon.get_path();
        }
    }
);

var WireGuarIndicatorPreferencesWidget = GObject.registerClass(
    class WireGuarIndicatorPreferencesWidget extends PreferencesWidget.Stack{
        _init(){
            super._init();

            let theme = Gtk.IconTheme.get_default();
            if (theme == null) {
                theme = new Gtk.IconTheme();
                theme.set_custom_theme(St.Settings.get().gtk_icon_theme);
            }
            theme.append_search_path(
                Extension.dir.get_child('icons').get_path());

            let preferencesPage = new PreferencesWidget.Page();
            this.add_titled(preferencesPage, "preferences", _("Preferences"));

            var settings = Convenience.getSettings();
            
            let indicatorSection = preferencesPage.addSection(_("Indicator options"), null, {});
            indicatorSection.addGSetting(settings, "services");
            indicatorSection.addGSetting(settings, "checktime");
            let appearanceSection = preferencesPage.addSection(_("General options"), null, {});
            appearanceSection.addGSetting(settings, "darktheme");

            // About Page
            let aboutPage = this.addPage(
                "about",
                _("About"),
                { vscrollbar_policy: Gtk.PolicyType.NEVER }
            );
            aboutPage.box.add(new AboutWidget());
            aboutPage.box.margin_top = 18;
        }
    }
);

function buildPrefsWidget() {
    let preferencesWidget = new WireGuarIndicatorPreferencesWidget();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
        let prefsWindow = preferencesWidget.get_toplevel()
        prefsWindow.set_position(Gtk.WindowPosition.CENTER_ALWAYS);
        prefsWindow.get_titlebar().custom_title = preferencesWidget.switcher;
        let icon = Extension.path + '/icons/wireguard-icon.svg';
        log(icon);
        prefsWindow.set_icon_from_file(icon);
        return false;
    });

    preferencesWidget.show_all();
    return preferencesWidget;
}
