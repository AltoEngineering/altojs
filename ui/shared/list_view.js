// ==========================================================================
// Project: Alto - JavaScript Application Framework
// Copyright: @2014 The Code Boutique, LLC
// License:   Intellectual property of The Code Boutique. LLC
// ==========================================================================

/**
 Gives logging to your console some color.

 @module UI
 @class Alto.ListView
 @extends Alto.CoreView
 @since Alto 0.0.1
 @author Chad Eubanks
 */

Alto.ListView = Alto.CoreView.extend (Alto.Array, {

    childViews: [],

    tag: "ul",

    cell: null,

    data: null,

    /*
     Gets the template and passes html elements to viewDidLoad().

     We dont know anything about the html elements nor should
     we make that assumption.
     */
    viewWillLoad: function() {
        var node = this.get("tag");
        node = document.createElement(node);
        this.viewDidLoad(node);
    },

    /*
     Has the html elements and passes them to viewWillAppear().

     We know about the html elements and can do some setup in here.
     Example: add disabled, hidden, etc className / adds alto object ids (maybe) / setup dynamic data and more...
     */
    viewDidLoad: function(node) {
        node ? node : node = document.createElement(this.get("tag"));
        if (node) {

            var n = 0,
                classNames = this.get('classNames');
            while (n < classNames.length) {
                node.className += node.className ? ' ' + classNames[n] : classNames[n];
                n++;
            }

            this.viewWillAppear(node);
        }
    },

    /*
     Create the views subviews

     */
    viewCreateSubViews: function() {
        if (Alto.isEmpty(this.get('data'))){return}

        var n = 0,
            data = this.get('data'),
            Cell = this.get('cell');

        while (n < data.length) {

            var cell = Cell.create({parentView: this, indexRow: n});

            this.childViews.pushObject(cell);

            this.node.appendChild(cell.node)
            n++;
        }
    },

    dataDidChange: function () {
        if (!this.get('data')) {return}

        Alto.DomUtil.removeAllChildren(this.node);

        var childViews = [];
        for (var i = 0, len = this.data.length; i < len; i++) {
            childViews.push(i);
        }

        this.set('childViews', childViews);
        this.viewCreateSubViews();
    }.observes('this.data')

})