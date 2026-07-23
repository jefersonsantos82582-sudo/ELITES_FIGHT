/**
 * Integração com Mercado Pago para processamento de pagamentos
 */

import axios from 'axios';
import * as db from '../db';

interface MercadoPagoConfig {
  accessToken: string;
  publicKey?: string;
}

interface CreatePreferencePayload {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  payer?: {
    email?: string;
    name?: string;
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
}

interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

class MercadoPagoService {
  private config: MercadoPagoConfig;
  private baseURL = 'https://api.mercadopago.com/checkout/preferences';

  constructor(config: MercadoPagoConfig) {
    if (!config.accessToken) {
      throw new Error('Mercado Pago Access Token is required');
    }
    this.config = config;
  }

  /**
   * Criar uma preferência de pagamento no Mercado Pago
   */
  async createPreference(payload: CreatePreferencePayload): Promise<MercadoPagoPreference> {
    try {
      const response = await axios.post(this.baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        id: response.data.id,
        init_point: response.data.init_point,
        sandbox_init_point: response.data.sandbox_init_point,
      };
    } catch (error) {
      console.error('Erro ao criar preferência no Mercado Pago:', error);
      throw new Error('Falha ao criar preferência de pagamento');
    }
  }

  /**
   * Criar preferência para upgrade de plano
   */
  async createPlanUpgradePreference(
    userId: number,
    userEmail: string,
    planCode: 'pro' | 'elite',
    planPrice: number,
    planName: string,
    successUrl: string,
    failureUrl: string
  ): Promise<MercadoPagoPreference> {
    const payload: CreatePreferencePayload = {
      items: [
        {
          id: `plan_${planCode}`,
          title: `Plano ${planName}`,
          quantity: 1,
          unit_price: planPrice,
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: failureUrl,
      },
      auto_return: 'approved',
      external_reference: `user_${userId}_plan_${planCode}_${Date.now()}`,
      // Configurações de pagamento para garantir suporte a Pix e Cartão
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
      },
      // No Render ou produção, a URL do webhook deve ser acessível publicamente
      notification_url: process.env.RENDER_EXTERNAL_URL 
        ? `${process.env.RENDER_EXTERNAL_URL}/api/webhooks/mercadopago`
        : "https://elites-fight.onrender.com/api/webhooks/mercadopago",
    };

    return this.createPreference(payload);
  }

  /**
   * Obter informações de um pagamento específico
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamento no Mercado Pago:', error);
      throw new Error('Falha ao buscar informações do pagamento');
    }
  }

  /**
   * Processar notificação de webhook do Mercado Pago
   */
  async processWebhookNotification(body: any): Promise<boolean> {
    try {
      console.log('Webhook recebido:', JSON.stringify(body));

      // O Mercado Pago envia notificações de diferentes tipos
      // O tipo 'payment' é o que nos interessa para confirmar o upgrade
      if (body.type === 'payment' || body.action === 'payment.created' || body.action === 'payment.updated') {
        const paymentId = body.data?.id || body.id;
        if (!paymentId) return false;

        const payment = await this.getPayment(paymentId);
        
        // Verificar se o pagamento foi aprovado
        if (payment.status === 'approved') {
          const externalReference = payment.external_reference;
          
          if (externalReference && externalReference.startsWith('user_')) {
            // Formato: user_{userId}_plan_{planCode}_{timestamp}
            const parts = externalReference.split('_');
            const userId = parseInt(parts[1], 10);
            const planCode = parts[3] as 'pro' | 'elite';

            if (!isNaN(userId) && (planCode === 'pro' || planCode === 'elite')) {
              console.log(`Atualizando plano do usuário ${userId} para ${planCode}`);
              // Define a data de expiração para 30 dias a partir do pagamento
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 30);
              await db.updateUserPlan(userId, planCode, expiresAt);
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return false;
    }
  }
}

export default MercadoPagoService;
