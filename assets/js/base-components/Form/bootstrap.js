// This file is here only to ensure backwards compatibility

import Vue from 'vue';
import jQuery from 'jquery';

window.$ = window.jQuery = jQuery;
window.Vue = Vue;

let token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    $.ajaxSetup({headers: {'X-CSRF-TOKEN': token.content}});
}