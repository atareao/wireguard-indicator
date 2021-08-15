#!/usr/bin/env gjs

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

const {GLib, GObject, Gio, Gtk} = imports.gi;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Widgets = Extension.imports.preferenceswidget;
const AboutPage = Extension.imports.aboutpage.AboutPage;
const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;


function init() {
    Convenience.initTranslations();
}

var AboutPage2 = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.AboutPage2').replace(/[\W_]+/g,'_')
    },
    class AboutPage2 extends Widgets.Page{
        _init(){
            super._init();
            const info = new Widgets.Frame();
            let extensionVersion;

            this.addLocalImage('wireguard-icon', 150);
            this.addLabel(
                '<span size="large"><b>' + _("WireGuard Indicator") + '</b></span>');

            /*
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
            */
        }
    }
);

var WireGuarIndicatorPreferencesWidget = GObject.registerClass(
    class WireGuarIndicatorPreferencesWidget extends Widgets.ListWithStack{
        _init(){
            super._init({});

            let preferencesPage = new Widgets.Page();

            var settings = Convenience.getSettings();

            let indicatorSection = preferencesPage.addFrame(_("Indicator options"));
            indicatorSection.addGSetting(settings, "services");

            let timeSection = preferencesPage.addFrame(_("Check time"));
            timeSection.addGSetting(settings, "checktime");

            const themePage = new Widgets.Page();
            const appearanceSection = themePage.addFrame(_("Appearance"));
            appearanceSection.addGSetting(settings, "darktheme");

            this.add(_("WireGuard Preferences"), "preferences-other-symbolic",
                     preferencesPage);
            this.add(_("Appearance"), "preferences-other-symbolic", themePage);
            this.add(_("About"), "help-about-symbolic", new AboutPage());
        }
    }
);

function buildPrefsWidget() {
    let preferencesWidget = new WireGuarIndicatorPreferencesWidget();
    preferencesWidget.connect("realize", ()=>{
        const window = preferencesWidget.get_root();
        window.set_title(_("WireGuard Indicator Configuration"));
        window.default_height = 800;
        window.default_width = 850;
    });
    return preferencesWidget;
}
