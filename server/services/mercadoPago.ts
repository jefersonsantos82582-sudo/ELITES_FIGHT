/**
 * Integração com Mercado Pago para processamento de pagamentos
 */

import axios from 'axios';

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
    };

    return this.createPreference(payload);
  }

  /**
   * Verificar status de um pagamento
   */
  async getPaymentStatus(preferenceId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.mercadopago.com/checkout/preferences/${preferenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      throw new Error('Falha ao verificar status do pagamento');
    }
  }

  /**
   * Processar notificação de webhook do Mercado Pago
   */
  async processWebhookNotification(body: any): Promise<boolean> {
    try {
      // Validar a assinatura do webhook (opcional mas recomendado)
      // Aqui você implementaria a validação de assinatura

      if (body.type === 'payment') {
        const paymentId = body.data?.id;
        console.log(`Pagamento recebido: ${paymentId}`);
        // Processar o pagamento aqui
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return false;
    }
  }
}

export default MercadoPagoService;
