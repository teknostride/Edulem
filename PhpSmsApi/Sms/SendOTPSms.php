<?php
	class SendOTPSms {
		public $content;
		public $number;
		public $encoding;
		public $sender;
		public $pushUrl = null;
		public $validity = 3;
		public $commercial = false;
		public $skipAhsQuery = null;
		public $customID = null;
		public $trustDate = null;

	 	function toString() {
	 		$jsonString = [
    			"number" => $this->number,
				"sender" => $this->sender,
    			"encoding" => $this->encoding,
    			"content" => $this->content,
    			"validity" => $this->validity,
    			"commercial" => $this->commercial
			];

			if(!is_null($this->pushUrl)){
				$jsonString["pushSettings"] = [
					"url" => $this->pushUrl
				];
    		}

			if(!is_null($this->skipAhsQuery)){
				$jsonString["skipAhsQuery"] = $this->skipAhsQuery;
    		}

    		if(!is_null($this->customID)){
				$jsonString["customID"] = $this->customID;
    		}

    		if(!is_null($this->trustDate)){
				$jsonString["trustDate"] = $this->trustDate;
    		}

	    	return $jsonString;
	  	}
	}
?>