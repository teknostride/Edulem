<?php
	class SmsItem {
		public $nr;
	 	public $msg;
	 	public $xid = null;

	 	public function __construct($nr, $msg, $xid = null) {
	        $this->nr = $nr;
	        $this->msg = $msg;
	        $this->xid = $xid;
	    }
	}
?>