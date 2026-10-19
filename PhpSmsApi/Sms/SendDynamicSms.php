<?php
	require_once('SmsItem.php');

	class SendDynamicSms {
		public $title;
		public $content;
		public $numbers;
		public $encoding;
		public $sender;
		public $pushUrl = null;
		public $periodicSettings = null;
		public $sendingDate = null;
		public $validity = 60;
		public $commercial = false;
		public $skipAhsQuery = null;
		public $customID = null;
		public $gateway = null;

	 	function toString() {
	 		$jsonString = [
				"type" => 1,
    			"sendingType" => 2,
    			"title" => $this->title,
    			"encoding" => $this->encoding,
    			"content" => $this->content,
    			"numbers" => $this->numbers,
    			"sender" => $this->sender,
    			"periodicSettings" => $this->periodicSettings,
    			"sendingDate" => $this->sendingDate,
    			"validity" => $this->validity,
    			"commercial" => $this->commercial
			];

			if(!is_null($this->pushUrl)){
				$jsonString["pushSettings"] = [
					"url" => $this->pushUrl
				];
    		}

    		if(!is_null($this->periodicSettings)){
				$jsonString["periodicSettings"] = [
					"periodType" => $this->periodicSettings->periodType,
					"interval" => $this->periodicSettings->interval,
					"amount" => $this->periodicSettings->amount
				];
    		}

			if(!is_null($this->skipAhsQuery)){
				$jsonString["skipAhsQuery"] = $this->skipAhsQuery;
    		}

    		if(!is_null($this->customID)){
				$jsonString["customID"] = $this->customID;
    		}

    		if(!is_null($this->gateway)){
				$jsonString["gateway"] = $this->gateway;
    		}

	    	return $jsonString;
	  	}
	}
?>