(function ($) {
	$(document).ready(function() {
		var list;
		$('#main_list').prepend($('<form><input type="text" class="search-query search" placeholder="Filter" id="filter" /></form>'))
		.each(function(){
			list = new List('main_list', {
				valueNames: ["name", "flavor"],
				page: 1000
			});

			list.sort('name', {asc: true});
		});

		$('#main_list .list td.name').each(function (){
			$this = $(this);
			if ($this.children('a').attr('href').match(/_small\.(png|jpg)$/i)) {
				var img = new Image();
				img.src = $this.children('a').attr('href');
				img.height = img.width = 75;
				img.classList.add("pull-right")
				$this.append(img);
			}
		});

		$('.label').click(function() {
			list.search($(this).text());
		});
	});
})(jQuery);