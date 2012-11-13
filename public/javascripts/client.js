(function ($) {

	function resetPrettyPrint() {
		$('pre').each(function() {
			el = $(this);
			el.html(el.text());
		});
		prettyPrint();
	}

	// loads file, appends a hidden <pre> to node and calls callback
	function renderJSFile(url, node, cb) {
		if (node.find('pre').length) return cb();
		$.get(url, function (resp) {
			var js = js_beautify(JSON.stringify(resp)),
				el = $('<pre class="prettyprint">'+ js +'</pre>').hide();
			node.append(el);
			resetPrettyPrint();
			cb();
		});
	}

	$(document).ready(function() {
		/*
		 * List filter
		 */
		var list;
		$('#main_list').prepend($('<form><input type="text" class="search-query search" placeholder="Filter" id="filter" /></form>'))
		.each(function(){
			list = new List('main_list', {
				valueNames: ["name", "flavor"],
				page: 1000
			});

			list.sort('name', {asc: true});
		});
		// do a search when you click a label
		$('.label').click(function() {
			list.search($(this).text());
		});

		/*
		 * Special list item preview doodads
		 */
		$('#main_list .list td.name').each(function (){
			var $this = $(this),
				link = $this.children('a');
			// image file
			if (link.attr('href').match(/_small\.(png|jpg)$/i)) {
				var img = new Image();
				img.src = link.attr('href');
				img.height = img.width = 75;
				img.classList.add("pull-right")
				$this.append(img);
			// js file
			} else if (link.attr('href').match(/.(js|json)$/i)) {
				$this.append(
					$('<a class="btn btn-small pull-right data-src" href="'+ link.attr('href') +'" alt="Preview Data File">{ }</a>')
				);
			}
		});

		// Preview data source (js files or catalog/manifest index)
		$('body').on("click", "a.data-src", function(e) {
			e.preventDefault();
			var $el = $(e.target);
			renderJSFile($el.attr('href'), $el.parent(), function afterLoad(){
				$el.toggleClass('active');
				$el.parent().find('pre').slideToggle();
			});

			return false;
		});
	});
})(jQuery);