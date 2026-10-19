<?php

	class GetSmsReports {
		public $ids = null;
		public $sender = null;
		public $status = null;
		public $customIDs = null;
		public $startDate;
		public $finishDate;
		public $pageIndex = 0;
		public $pageSize = 100;
	
		function toString() {
	 		$jsonString = [
				"ids" => $this->ids,
				"sender" => $this->sender,
				"status" => $this->status,
				"startDate" => $this->startDate,
				"finishDate" => $this->finishDate,
				"pageIndex" => $this->pageIndex,
				"pageSize" => $this->pageSize
			];

			if(!is_null($this->customIDs)){
				$jsonString["customIDs"] = $this->customIDs;
    		}
			
	    	return $jsonString;
	  	}
	}
?>