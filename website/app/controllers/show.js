import Controller from '@ember/controller';
import showdown from 'showdown';
import { set, action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';

import { showdownConfig } from '../shared/showdown-config';

export default class ShowController extends Controller {
  @tracked sections = A([]);
  @tracked tabs = A([]);
  @tracked tocs = A([]);

  get title() {
    return this.model.frontmatter?.title ?? '';
  }

  get description() {
    return this.model.frontmatter?.description ?? false;
  }

  get renderedContent() {
    const converter = new showdown.Converter(showdownConfig);
    return converter.makeHtml(this.model.content);
  }

  @action
  didInsertContent(docPageContentElement) {
    let sections = [];
    let tabs = [];
    let tocs = [];
    docPageContentElement
      .querySelectorAll(`section[id^=section-]`)
      .forEach((section, index) => {
        // SECTIONS
        const name = section.id.replace(/^section-/, '');
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('tabindex', '0');
        section.setAttribute('aria-labelledby', `tab-${name}`);
        section.setAttribute('hidden', true);
        sections.push(section);
        // TABS
        tabs.push({
          index,
          id: `tab-${name}`,
          label: name,
          target: section.id,
          onClickTab: this.onClickTab,
          isCurrent: false,
        });
        // TOCS
        let headings = [];
        section
          .querySelectorAll(`#${section.id} > h2, #${section.id} > h3`)
          .forEach((element) => {
            // we need to add a class to avoid the element being hidden behind the fixed top header
            element.classList.add('doc-page-sidecar-scroll-margin-top');
            // we add it to the list of headings used as TOC in the sidecar
            headings.push({
              target: element.id,
              text: element.innerText,
              depth: element.tagName.replace(/h/i, ''),
            });
          });
        tocs.push({
          index,
          id: `toc-${name}`,
          list: headings,
        });
      });
    this.sections.setObjects(sections);
    this.tabs.setObjects(tabs);
    this.tocs.setObjects(tocs);
    // TODO handle when the page loads which one is the current, based on the URL query params
    this.setCurrent(0);
    // leave for debugging
    // console.log('show didInsert', this.sections, this.tabs, this.tocs);
  }

  @action
  onClickTab(tab) {
    // console.log('show onClickTab', tab);
    this.setCurrent(tab.index);
  }

  @action
  setCurrent(current) {
    // TABS
    this.tabs.forEach((tab) => {
      set(tab, 'isCurrent', tab.index === current);
    });
    // SECTIONS
    this.sections.forEach((section, index) => {
      if (index === current) {
        section.removeAttribute('hidden');
      } else {
        section.setAttribute('hidden', true);
      }
    });
    // TOCS
    this.tocs.forEach((toc) => {
      set(toc, 'isCurrent', toc.index === current);
    });
    // leave for debugging
    // console.log('show setCurrent', this.sections, this.tabs, this.tocs);
  }
}