<?php

	class GetSmsReportDetails {
		public $pkgID;
		public $target = null;
		public $operator = null;
		public $state = null;
		public $customID = null;
		public $pageIndex = 0;
		public $pageSize = 100;
	
		function toString() {
	 		$jsonString = [
				"pkgID" => $this->pkgID,
				"target" => $this->target,
				"state" => $this->state,
				"pageIndex" => $this->pageIndex,
				"pageSize" => $this->pageSize
			];

			if(!is_null($this->customID)){
				$jsonString["customID"] = $this->customID;
    		}

			if(!is_null($this->operator)){
				$jsonString["operator"] = $this->operator;
    		}
    		
	    	return $jsonString;
	  	}
	}
?>				