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

var WireGuarIndicatorPreferencesWidget = GObject.registerClass(
    class WireGuarIndicatorPreferencesWidget extends Widgets.ListWithStack{
        _init(){
            super._init({});

            let preferencesPage = new Widgets.Page();

            var settings = Convenience.getSettings();

            let indicatorSection = preferencesPage.addFrame(
                _("Indicator options"));
            indicatorSection.addGSetting(settings, "services");

            let servicesSection = new Widgets.ArrayKeyValueSetting(
                settings, "services", _("Name"), _("Service"));
            preferencesPage.addFrame(_("Services"), servicesSection);

            const frame = new Widgets.FrameRow({
                marginTop: 20,
            });
            const addServicesSection = preferencesPage.addFrame("", frame);
            const buttonAdd = new Gtk.Button({
                iconName: 'add-symbolic',
                hexpand: true,
                vexpand: false,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            addServicesSection.addWidget(_("Add more services"), buttonAdd);


            let timeSection = preferencesPage.addFrame(_("Check time"));
            timeSection.addWidgetSetting(settings, "checktime", new Widgets.NumberSetting(settings, "checktime", 5, 60 * 100));

            const themePage = new Widgets.Page();
            const styleSection = themePage.addFrame(_("Theme"));
            styleSection.addGSetting(settings, "darktheme");

            this.add(_("WireGuard Preferences"), "preferences-other-symbolic",
                     preferencesPage);
            this.add(_("Style"), "style", themePage);
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
