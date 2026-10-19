<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. TENANTS tablosuna kurumsal CRM, fatura ve sözleşme alanları ekleme
        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'official_title')) {
                $table->string('official_title')->nullable()->after('name')->comment('Resmi Ticari / Şirket Unvanı');
            }
            if (!Schema::hasColumn('tenants', 'authorized_person')) {
                $table->string('authorized_person')->nullable()->after('official_title')->comment('Yetkili Kişi (Kurucu / Müdür)');
            }
            if (!Schema::hasColumn('tenants', 'authorized_phone')) {
                $table->string('authorized_phone')->nullable()->after('authorized_person');
            }
            if (!Schema::hasColumn('tenants', 'authorized_email')) {
                $table->string('authorized_email')->nullable()->after('authorized_phone');
            }
            if (!Schema::hasColumn('tenants', 'accounting_phone')) {
                $table->string('accounting_phone')->nullable()->after('authorized_email')->comment('Muhasebe İletişim Numarası');
            }
            if (!Schema::hasColumn('tenants', 'tax_office')) {
                $table->string('tax_office')->nullable()->after('accounting_phone')->comment('Vergi Dairesi');
            }
            if (!Schema::hasColumn('tenants', 'tax_number')) {
                $table->string('tax_number')->nullable()->after('tax_office')->comment('Vergi No / T.C.');
            }
            if (!Schema::hasColumn('tenants', 'address')) {
                $table->text('address')->nullable()->after('tax_number');
            }
            if (!Schema::hasColumn('tenants', 'city')) {
                $table->string('city', 100)->nullable()->after('address');
            }
            if (!Schema::hasColumn('tenants', 'district')) {
                $table->string('district', 100)->nullable()->after('city');
            }
            if (!Schema::hasColumn('tenants', 'contract_amount')) {
                $table->decimal('contract_amount', 12, 2)->default(0)->after('district')->comment('Yıllık Sözleşme Tutarı');
            }
            if (!Schema::hasColumn('tenants', 'contract_start_date')) {
                $table->date('contract_start_date')->nullable()->after('contract_amount');
            }
            if (!Schema::hasColumn('tenants', 'contract_end_date')) {
                $table->date('contract_end_date')->nullable()->after('contract_start_date');
            }
            if (!Schema::hasColumn('tenants', 'notes')) {
                $table->text('notes')->nullable()->after('contract_end_date');
            }
        });

        // 2. SAAS_MODULES tablosu (Dinamik *lem Ürün Kataloğu)
        if (!Schema::hasTable('saas_modules')) {
            Schema::create('saas_modules', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique()->comment('quizlem, keylem, classlem, rahlem vb.');
                $table->string('name', 100)->comment('Görünen Ad: QuizLem, KeyLem vb.');
                $table->text('description')->nullable();
                $table->string('icon', 50)->default('ti-apps');
                $table->string('badge_color', 30)->default('primary');
                $table->decimal('annual_price', 12, 2)->default(0)->comment('Varsayılan Yıllık Satış Fiyatı');
                $table->decimal('monthly_price', 12, 2)->default(0)->comment('Varsayılan Aylık Fiyat');
                $table->boolean('is_active')->default(true)->comment('Satışta / Yayında mı');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // 3. TENANT_MODULE_LICENSES tablosu (Okul Modül Lisansları)
        if (!Schema::hasTable('tenant_module_licenses')) {
            Schema::create('tenant_module_licenses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('module_code', 50);
                $table->boolean('is_active')->default(true)->comment('Açık / Kapalı anahtarı');
                $table->decimal('agreed_price', 12, 2)->default(0)->comment('Okula Özel Anlaşılan Fiyat');
                $table->date('starts_at')->nullable();
                $table->date('expires_at')->nullable();
                $table->timestamps();

                $table->unique(['tenant_id', 'module_code']);
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            });
        }

        // 4. TENANT_PAYMENTS tablosu (Okullardan Alınan Ücretler & Taksitler)
        if (!Schema::hasTable('tenant_payments')) {
            Schema::create('tenant_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('title')->comment('1. Taksit, Peşinat, Yıllık Lisans vb.');
                $table->decimal('amount', 12, 2)->comment('Taksit / Borç Tutarı');
                $table->date('due_date')->comment('Vade Tarihi');
                $table->decimal('paid_amount', 12, 2)->default(0)->comment('Ödenen Miktar');
                $table->date('paid_at')->nullable()->comment('Ödeme Yapılan Tarih');
                $table->string('payment_method', 50)->nullable()->comment('havale, eft, kredi_karti, nakit, cek');
                $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
                $table->string('receipt_no', 100)->nullable()->comment('Dekont No / Fiş');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'status']);
                $table->index('due_date');
            });
        }

        // 5. SAAS_EXPENSES tablosu (EduLem Şirket Giderleri)
        if (!Schema::hasTable('saas_expenses')) {
            Schema::create('saas_expenses', function (Blueprint $table) {
                $table->id();
                $table->string('category', 50)->comment('sunucu_hosting, sms_maliyeti, domain_ssl, yazilim_api, personel, ofis_muhasebe, diger');
                $table->string('title');
                $table->decimal('amount', 12, 2);
                $table->date('expense_date');
                $table->string('receipt_no', 100)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['category', 'expense_date']);
            });
        }

        // 6. USERS tablosuna SaaS Personel Rolü Alanı
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'saas_role')) {
                $table->string('saas_role', 50)->nullable()->after('is_superadmin')
                    ->comment('super_admin (patron), technical_support (destek), finance (muhasebe), sales (satış)');
            }
        });

        // 7. SAAS_AUDIT_LOGS tablosu (SaaS Personel İşlem ve Sızma Kayıtları)
        if (!Schema::hasTable('saas_audit_logs')) {
            Schema::create('saas_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->comment('İşlemi Yapan Şirket Personeli');
                $table->string('user_name');
                $table->string('action', 50)->comment('impersonate_start, impersonate_stop, tenant_created, tenant_deleted, payment_recorded, license_changed');
                $table->unsignedBigInteger('target_tenant_id')->nullable();
                $table->string('target_tenant_name')->nullable();
                $table->text('details')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();

                $table->index(['user_id', 'action']);
                $table->index('target_tenant_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_audit_logs');
        Schema::dropIfExists('saas_expenses');
        Schema::dropIfExists('tenant_payments');
        Schema::dropIfExists('tenant_module_licenses');
        Schema::dropIfExists('saas_modules');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'saas_role')) {
                $table->dropColumn('saas_role');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            $cols = [
                'official_title', 'authorized_person', 'authorized_phone', 'authorized_email',
                'accounting_phone', 'tax_office', 'tax_number', 'address', 'city', 'district',
                'contract_amount', 'contract_start_date', 'contract_end_date', 'notes'
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('tenants', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
