(function ($) {
	$(document).ready(function() {
		$('#main_list').prepend($('<input class="search" />'))
		list = new List('main_list', {
			valueNames: ["name"],
			page: 1000
		});

		list.sort('name', {asc: true});

	});
})(jQuery);