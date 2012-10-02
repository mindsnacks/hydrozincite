(function ($) {
	$(document).ready(function() {
		$('#main_list').prepend($('<span>Filter: <input class="search" /></span>')).each(function(){
			list = new List('main_list', {
				valueNames: ["name", "flavor"],
				page: 1000
			});

			list.sort('name', {asc: true});
		});

		$('#main_list .list li').each(function (){
			$this = $(this);
			if ($this.children('a').attr('href').match(/_small\.(png|jpg)$/i)) {
				var img = new Image();
				img.src = $this.children('a').attr('href');
				img.height = img.width = 75;
				$this.prepend(img);
			}
		});
	});
})(jQuery);